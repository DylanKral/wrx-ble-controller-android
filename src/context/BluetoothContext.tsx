import { getBrowserStorage } from "../storage/persistence";
import { Capacitor } from "@capacitor/core";
import { NativeBLETransport } from "../bluetooth/NativeBLETransport";
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { BLEManager } from "../bluetooth/BLEManager";
const BluetoothContext = createContext<BLEManager | null>(null);
export function BluetoothProvider({ children }: { children: ReactNode }) {
  const [manager] = useState(() => {
    if (!Capacitor.isNativePlatform()) return new BLEManager();
    const native = new NativeBLETransport(undefined, getBrowserStorage().storage, message => manager.report(message));
    const manager = new BLEManager(() => native);
    return manager;
  });
  return (
    <BluetoothContext.Provider value={manager}>
      {children}
    </BluetoothContext.Provider>
  );
}
export function useBluetooth() {
  const manager = useContext(BluetoothContext);
  if (!manager) throw new Error("Missing Bluetooth provider");
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  return {
    manager,
    ...state,
    supported: Capacitor.isNativePlatform() || (!!navigator.bluetooth && window.isSecureContext),
    native: Capacitor.isNativePlatform(),
  };
}
