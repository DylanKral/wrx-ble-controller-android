import { BleClient, type BleClientInterface } from '@capacitor-community/bluetooth-le';
import type { BLEDevice, BLETransport, BLECharacteristic } from './transport';
import { WRITE_SERVICE, WRITE_CHARACTERISTIC } from './commands';
import { names } from './types';

const STORAGE_KEY = 'wrx-android-ble-devices-v1';
type SavedDevice = { deviceId: string; name: string };
type DeviceStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Native scan picker + GATT adapter. BLEManager retains ownership of retries
 * and serialized/cancellable command delivery; this class owns native handles. */
export class NativeBLETransport implements BLETransport {
  private initialized?: Promise<void>;
  private devices = new Map<string, BLEDevice>();
  private choosing = false;
  constructor(
    private client: BleClientInterface = BleClient,
    private storage: DeviceStorage = localStorage,
    private report: (message: string) => void = () => {},
  ) {}
  private async ready() {
    this.initialized ??= this.client.initialize({ androidNeverForLocation: true })
      .catch(error => { this.initialized = undefined; throw error; });
    await this.initialized;
    if (!await this.client.isEnabled()) await this.client.requestEnable();
  }
  private saved(): SavedDevice[] {
    try {
      const value: unknown = JSON.parse(this.storage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(value) ? value.filter((d): d is SavedDevice =>
        !!d && typeof d.deviceId === 'string' && d.deviceId.length > 0 &&
        Object.values(names).includes(d.name)) : [];
    } catch { return []; }
  }
  private remember(device: SavedDevice) {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify([
        ...this.saved().filter(d => d.name !== device.name && d.deviceId !== device.deviceId), device,
      ]));
    } catch { this.report('Connected, but device identity could not be saved.'); }
  }
  async requestDevice(_options: RequestDeviceOptions): Promise<BLEDevice> {
    if (this.choosing) throw new Error('Finish the current Bluetooth device selection first.');
    this.choosing = true;
    try {
      await this.ready();
      // The plugin owns scan start/stop and presents an Android selection dialog.
      // Do not filter by service: Dream advertisements may omit their service UUID.
      const device = await this.client.requestDevice({ namePrefix: 'Dream' });
      if (!device.name || !Object.values(names).includes(device.name))
        throw new Error('Select Dream-CF4B (left) or Dream-A90F (right).');
      return this.wrap({ deviceId: device.deviceId, name: device.name });
    } finally { this.choosing = false; }
  }
  async getDevices(): Promise<BLEDevice[]> {
    // Reading saved IDs never prompts for permissions on a fresh simulation install.
    return this.saved().map(device => this.wrap(device));
  }
  private wrap(info: SavedDevice): BLEDevice {
    const existing = this.devices.get(info.deviceId);
    if (existing) return existing;
    const events = new EventTarget();
    let connected = false;
    let generation = 0;
    let disconnecting: Promise<void> = Promise.resolve();
    const lost = () => {
      const wasConnected = connected;
      connected = false;
      if (wasConnected) events.dispatchEvent(new Event('gattserverdisconnected'));
    };
    const gatt = {
      get connected() { return connected; },
      connect: async () => {
        await disconnecting;
        await this.ready();
        const session = ++generation;
        let dropped = false;
        try {
          await this.client.connect(info.deviceId, () => {
            if (session !== generation) return;
            dropped = true;
            lost();
          }, { timeout: 10000 });
          const services = await this.client.getServices(info.deviceId);
          const service = services.find(s => s.uuid.toLowerCase() === WRITE_SERVICE);
          const characteristic = service?.characteristics.find(c => c.uuid.toLowerCase() === WRITE_CHARACTERISTIC);
          if (!characteristic || (!characteristic.properties.writeWithoutResponse && !characteristic.properties.write))
            throw new Error('Dream writable service/characteristic not found.');
          if (dropped || session !== generation) throw new Error('Disconnected during service discovery.');
          connected = true;
          this.remember(info);
          const write = async (bytes: Uint8Array<ArrayBuffer>, withoutResponse: boolean) => {
            if (!connected || session !== generation) throw new Error('Disconnected before native write.');
            const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
            // Native operation timeout is shorter than BLEManager's queue watchdog.
            try {
              if (withoutResponse)
                await this.client.writeWithoutResponse(info.deviceId, WRITE_SERVICE, WRITE_CHARACTERISTIC, data, { timeout: 5000 });
              else
                await this.client.write(info.deviceId, WRITE_SERVICE, WRITE_CHARACTERISTIC, data, { timeout: 5000 });
            } catch (error) {
              // An uncertain write must not let later animation packets overtake it.
              // Invalidate this handle; normal bounded reconnect can recover the link.
              if (session === generation) gatt.disconnect();
              throw error;
            }
            if (!connected || session !== generation) throw new Error('Disconnected during native write.');
          };
          const char: BLECharacteristic = {
            properties: { writeWithoutResponse: !!characteristic.properties.writeWithoutResponse },
            ...(characteristic.properties.writeWithoutResponse ? { writeValueWithoutResponse: (b: Uint8Array<ArrayBuffer>) => write(b, true) } : {}),
            ...(characteristic.properties.write ? { writeValueWithResponse: (b: Uint8Array<ArrayBuffer>) => write(b, false) } : {}),
          };
          return { getPrimaryService: async (uuid: string) => {
            if (uuid !== WRITE_SERVICE) throw new Error('Unknown service');
            return { getCharacteristic: async (id: string) => {
              if (id !== WRITE_CHARACTERISTIC) throw new Error('Unknown characteristic');
              return char;
            } };
          } };
        } catch (error) {
          lost();
          await this.client.disconnect(info.deviceId).catch(() => {});
          throw error;
        }
      },
      disconnect: () => {
        ++generation;
        lost();
        disconnecting = this.client.disconnect(info.deviceId).catch(error => {
          this.report('Native Bluetooth disconnect failed: ' + String(error));
        });
      },
    };
    const device: BLEDevice = Object.assign(events, { id: info.deviceId, name: info.name, gatt });
    this.devices.set(info.deviceId, device);
    return device;
  }
}
