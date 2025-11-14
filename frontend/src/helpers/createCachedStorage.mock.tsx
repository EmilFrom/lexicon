import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import mockData from '../__mocks__/mockData';

type JsonValue =
  | null
  | boolean
  | number
  | string
  | Array<JsonValue>
  | undefined
  | { [key: string]: JsonValue };

type Reviver<T> = (parsed: JsonValue) => T;

type DataStore<T extends object> = {
  getItem: <Key extends keyof T>(key: Key) => T[Key] | null;
  setItem: <Key extends keyof T>(key: Key, value: T[Key]) => void;
  removeItem: <Key extends keyof T>(key: Key) => void;
};

export function createCachedStorage<
  Obj extends Record<string | number, JsonValue>,
  Schema extends {
    [K in keyof Obj]: Reviver<Obj[K]>;
  },
  Data extends {
    [K in keyof Schema]: ReturnType<Schema[K]>;
  },
>(schema: Schema, prefix = '') {
  const Context = createContext<DataStore<Data> | undefined>(undefined);

  const StorageProvider = (props: { children: ReactElement }) => {
    const [isLoading, setLoading] = useState(true);
    const dataRef = useRef<Partial<Data>>({});

    useEffect(() => {
      const data = dataRef.current;

      const load = async () => {
        /**
         * The part we mock for add async storage user when open app
         */
        await AsyncStorage.setItem(
          prefix + String('user'),
          JSON.stringify(mockData.users[0]),
        );

        for (const [key, reviver] of Object.entries(schema)) {
          const value = await AsyncStorage.getItem(prefix + String(key));
          if (value != null) {
            try {
              const keySchema: keyof Schema = key;
              // This will throw if the string does not parse or if the parsed
              // value cannot be revived successfully.
              data[keySchema] = reviver(JSON.parse(value));
            } catch {
              // Ignore parsing errors in mock storage
            }
          }
        }
        setLoading(false);
      };
      load();
    }, []);

    const context = useMemo(() => {
      const data = dataRef.current;

      return {
        getItem: <Key extends keyof Data>(key: Key) => data[key] ?? null,
        setItem: <Key extends keyof Data>(
          key: Key,
          value: Data[Key] | undefined,
        ) => {
          data[key] = value;
          // TODO: Throttle this so if we write in rapid succession (such as
          // onScroll saving scroll position) we won't thrash the disk.
          AsyncStorage.setItem(prefix + String(key), JSON.stringify(value));
        },
        removeItem: <Key extends keyof Data>(key: Key) => {
          data[key] = undefined;
          AsyncStorage.removeItem(prefix + String(key));
        },
      };
    }, []);

    return isLoading ? null : (
      <Context.Provider value={context}>{props.children}</Context.Provider>
    );
  };

  const useStorage = () => {
    const context = useContext(Context);

    if (context === undefined) {
      throw new Error();
    }

    return context;
  };

  return [StorageProvider, useStorage] as const;
}
