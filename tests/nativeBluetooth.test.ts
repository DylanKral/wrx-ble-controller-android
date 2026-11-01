import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BleClientInterface } from '@capacitor-community/bluetooth-le';
import { NativeBLETransport } from '../src/bluetooth/NativeBLETransport';
import { BLEManager } from '../src/bluetooth/BLEManager';
import { WRITE_SERVICE, WRITE_CHARACTERISTIC, modeBytes, colorBytes } from '../src/bluetooth/commands';

function fixture(withoutResponse = true) {
  const saved = new Map<string, string>();
  const storage = { getItem: (k: string) => saved.get(k) ?? null, setItem: (k: string, v: string) => { saved.set(k, v); } };
  const callbacks = new Map<string, () => void>();
  const client = {
    initialize: vi.fn(async () => {}), isEnabled: vi.fn(async () => true), requestEnable: vi.fn(async () => {}),
    requestDevice: vi.fn().mockResolvedValueOnce({ deviceId: 'AA:01', name: 'Dream-CF4B' }).mockResolvedValueOnce({ deviceId: 'AA:02', name: 'Dream-A90F' }),
    connect: vi.fn(async (id: string, cb: () => void) => { callbacks.set(id, cb); }),
    disconnect: vi.fn(async () => {}),
    getServices: vi.fn(async () => [{ uuid: WRITE_SERVICE, characteristics: [{ uuid: WRITE_CHARACTERISTIC, properties: { write: true, writeWithoutResponse: withoutResponse }, descriptors: [] }] }]),
    write: vi.fn(async () => {}), writeWithoutResponse: vi.fn(async () => {}),
  };
  const transport = new NativeBLETransport(client as unknown as BleClientInterface, storage);
  const manager = new BLEManager(() => transport, () => true);
  return { transport, manager, client, storage, saved, callbacks };
}
afterEach(() => vi.useRealTimers());
describe('native Android transport', () => {
  it('does not request Bluetooth permissions without saved devices', async () => {
    const { manager, client } = fixture();
    expect(await manager.restoreDevices()).toBe(false);
    expect(client.initialize).not.toHaveBeenCalled();
  });
  it('scans for Dream controllers and transmits verified bytes to two independent IDs', async () => {
    const { manager, client } = fixture();
    await manager.connect('left'); await manager.connect('right');
    expect(client.initialize).toHaveBeenCalledWith({ androidNeverForLocation: true });
    expect(client.requestDevice).toHaveBeenCalledWith({ namePrefix: 'Dream' });
    expect(manager.state.connected).toEqual({ left: true, right: true });
    expect(await manager.send(modeBytes(4))).toBe(true);
    const calls = client.writeWithoutResponse.mock.calls as unknown as [string, string, string, DataView][];
    expect(calls.map(c => c[0])).toEqual(['AA:01', 'AA:02']);
    for (const call of calls) {
      expect(call.slice(1, 3)).toEqual([WRITE_SERVICE, WRITE_CHARACTERISTIC]);
      expect([...new Uint8Array(call[3].buffer)]).toEqual([0x9e, 0, 3, 0x81, 0x98, 0, 0xe9]);
    }
    manager.dispose();
  });
  it('restores saved native IDs across transport instances without scanning', async () => {
    const { manager, client, storage } = fixture();
    await manager.connect('left');
    const restarted = new BLEManager(() => new NativeBLETransport(client as unknown as BleClientInterface, storage));
    expect(await restarted.restoreDevices()).toBe(true);
    expect(client.requestDevice).toHaveBeenCalledTimes(1);
    expect(restarted.isUp('left')).toBe(true);
  });
  it('forwards disconnects, retries, and honors manual disconnect', async () => {
    vi.useFakeTimers();
    const { manager, client, callbacks } = fixture();
    await manager.connect('left');
    const listener = vi.fn(); manager.onDisconnect(listener);
    callbacks.get('AA:01')!();
    expect(listener).toHaveBeenCalledWith('left');
    expect(manager.isUp('left')).toBe(false);
    await vi.advanceTimersByTimeAsync(1500);
    expect(manager.isUp('left')).toBe(true);
    manager.disconnect('left');
    await vi.advanceTimersByTimeAsync(60000);
    expect(client.connect).toHaveBeenCalledTimes(2);
    manager.dispose();
  });
  it('uses with-response writes when required and preserves RGB red', async () => {
    const { manager, client } = fixture(false);
    await manager.connect('left');
    expect(await manager.send(colorBytes('#ff0000'))).toBe(true);
    expect(client.writeWithoutResponse).not.toHaveBeenCalled();
    const call = client.write.mock.calls[0] as unknown as [string, string, string, DataView];
    expect([...new Uint8Array(call[3].buffer)]).toEqual([0x56, 255, 0, 0, 0, 0xf0, 0xaa]);
  });
  it('rejects missing characteristics and releases a failed native connection', async () => {
    const { manager, client, saved } = fixture();
    client.getServices.mockResolvedValueOnce([]);
    await manager.connect('left');
    expect(manager.isUp('left')).toBe(false);
    expect(client.disconnect).toHaveBeenCalledWith('AA:01');
    expect(saved.size).toBe(0);
  });
  it('retries permission initialization after denial', async () => {
    const { manager, client } = fixture();
    client.initialize.mockRejectedValueOnce(new Error('Permission denied'));
    await manager.connect('left');
    expect(manager.state.message).toContain('Permission denied');
    await manager.connect('left');
    expect(manager.isUp('left')).toBe(true);
    expect(client.initialize).toHaveBeenCalledTimes(2);
  });
  it('does not save a controller assigned to the wrong side', async () => {
    const { manager, client, saved } = fixture();
    await manager.connect('right');
    expect(client.connect).not.toHaveBeenCalled();
    expect(saved.size).toBe(0);
  });
  it('invalidates a failed write connection before another packet can use it', async () => {
    const { manager, client } = fixture();
    manager.setRestoreEnabled(false);
    await manager.connect('left');
    client.writeWithoutResponse.mockRejectedValueOnce(new Error('Write timeout'));
    expect(await manager.send(modeBytes(4))).toBe(false);
    expect(manager.isUp('left')).toBe(false);
    expect(client.disconnect).toHaveBeenCalledWith('AA:01');
    expect(await manager.send(colorBytes('#ff0000'))).toBe(false);
    expect(client.writeWithoutResponse).toHaveBeenCalledTimes(1);
    manager.dispose();
  });
  it('waits for an outstanding native write before red and drops cancelled queued packets', async () => {
    const { manager, client } = fixture();
    await manager.connect('left');
    let release!: () => void;
    client.writeWithoutResponse.mockImplementationOnce(() => new Promise<void>(r => { release = r; }));
    const first = manager.send(modeBytes(4));
    await vi.waitFor(() => expect(client.writeWithoutResponse).toHaveBeenCalledTimes(1));
    const cancelled = manager.send(modeBytes(7), () => false);
    const red = manager.send(colorBytes('#ff0000'));
    release();
    expect(await first).toBe(true); expect(await cancelled).toBe(false); expect(await red).toBe(true);
    expect(client.writeWithoutResponse).toHaveBeenCalledTimes(2);
  });
});
