/** Minimal GATT contract shared by browser preview and native Android.
 * The scheduler, calibration and packet queue never depend on Capacitor. */
export interface BLECharacteristic {
  properties?: { writeWithoutResponse?: boolean };
  writeValueWithoutResponse?(bytes: Uint8Array<ArrayBuffer>): Promise<void>;
  writeValueWithResponse?(bytes: Uint8Array<ArrayBuffer>): Promise<void>;
  writeValue?(bytes: Uint8Array<ArrayBuffer>): Promise<void>;
}
export interface BLEService {
  getCharacteristic(uuid: string): Promise<BLECharacteristic>;
}
export interface BLEDevice extends EventTarget {
  readonly id: string;
  readonly name?: string;
  readonly gatt?: {
    readonly connected: boolean;
    connect(): Promise<{ getPrimaryService(uuid: string): Promise<BLEService> }>;
    disconnect(): void;
  };
}
export interface BLETransport {
  requestDevice(options: RequestDeviceOptions): Promise<BLEDevice>;
  getDevices?(): Promise<BLEDevice[]>;
}
