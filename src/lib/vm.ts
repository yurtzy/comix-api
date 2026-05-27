import fs from 'fs';
import path from 'path';

let cachedJs: string | null = null;

function loadVMCode(): string {
  if (cachedJs) return cachedJs;
  
  const filename = 'secure-tfp0vp-D10gqGoG.js';
  const filePath = path.join(process.cwd(), filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`VM security file not found at: ${filePath}`);
  }
  
  const js = fs.readFileSync(filePath, 'utf8');
  
  // Pre-process ES module syntax to make it runnable in a Function sandbox in Node.js
  let processedJs = js;
  processedJs = processedJs.replace(
    /import\s*\{\s*r\s*as\s*e\s*\}\s*from\s*["']\.\/rolldown-runtime[^\x00-\x1f"']+\.js["'];?/g,
    'const e = (x) => (x && x.__esModule) ? x : { default: x };'
  );
  
  // Expose the internal 'io' export from VM to global namespace so we can register Axios
  processedJs = processedJs.replace(
    /export\s*\{[^}]+\};?/g,
    'global.Nr = Nr; global.xr = xr; global.Mr = Mr; global.io = io;'
  );
  
  cachedJs = processedJs;
  return processedJs;
}

export interface Decryptor {
  getSignature(): Promise<string>;
  decryptResponse(encryptedData: any): Promise<any>;
}

export function getChapterDecryptor(chapterId: string, cfgToken: string): Decryptor {
  const processedJs = loadVMCode();
  
  // Create a recursive Proxy to mock any browser global property access safely
  function createRecursiveProxy(name: string, overrides: Record<string, any> = {}): any {
    function target() {}
    Object.assign(target, overrides);
    
    return new Proxy(target, {
      get: (t: any, prop: string | symbol) => {
        if (typeof prop === 'string' && prop in overrides) {
          return overrides[prop];
        }
        if (prop === 'then' || typeof prop === 'symbol') return undefined;
        return createRecursiveProxy(`${name}.${String(prop)}`);
      },
      set: (t: any, prop: string | symbol, val: any) => {
        if (typeof prop === 'string') {
          overrides[prop] = val;
        }
        return true;
      },
      apply: () => createRecursiveProxy(`${name}()`),
      construct: () => createRecursiveProxy(`new_${name}`)
    });
  }

  // Set up browser-like mocks required for the VM to run without throwing errors
  const documentOverrides = {
    querySelector: (selector: string) => {
      if (selector.includes('meta[name="cfg"]') || selector.includes('meta[name=\'cfg\']') || selector === 'meta[name=cfg]') {
        return createRecursiveProxy('metaElement', {
          getAttribute: (attr: string) => attr === 'content' ? cfgToken : null
        });
      }
      return null;
    },
    querySelectorAll: (selector: string) => {
      if (selector === 'meta') {
        const metaEl = createRecursiveProxy('metaElement', {
          getAttribute: (attr: string) => attr === 'content' ? cfgToken : null,
          name: 'cfg',
          content: cfgToken
        });
        const list = [metaEl];
        (list as any).item = (idx: number) => list[idx];
        return list;
      }
      return [];
    },
    createElement: (tag: string) => createRecursiveProxy(`element(${tag})`, {
      style: createRecursiveProxy(`element(${tag}).style`),
      setAttribute: () => {}
    }),
    head: createRecursiveProxy('document.head'),
    body: createRecursiveProxy('document.body')
  };

  const mockDocument = createRecursiveProxy('document', documentOverrides);
  
  const mockLocation = createRecursiveProxy('location', {
    href: `https://comix.to/title/any-manga/${chapterId}-chapter-0`,
    origin: 'https://comix.to',
    protocol: 'https:',
    host: 'comix.to',
    hostname: 'comix.to',
    port: '',
    pathname: `/title/any-manga/${chapterId}-chapter-0`,
    search: '',
    hash: '',
    replace: () => {},
    assign: () => {},
    reload: () => {},
    toString: () => `https://comix.to/title/any-manga/${chapterId}-chapter-0`
  });
  
  const mockNavigator = createRecursiveProxy('navigator', {
    appCodeName: 'Mozilla', // CRITICAL decryption input key derivation
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    text: async () => '{"result": {}}',
    json: async () => ({ result: {} }),
    headers: new Map()
  });

  const windowOverrides = {
    document: mockDocument,
    location: mockLocation,
    navigator: mockNavigator,
    fetch: mockFetch,
    Object, Array, String, Number, Boolean, RegExp, Date, Math, JSON,
    console: { log: () => {}, error: () => {}, warn: () => {} }, // Silence VM logs
    setTimeout, clearTimeout, setInterval, clearInterval, Promise
  };

  const mockWindow = createRecursiveProxy('window', windowOverrides);
  mockWindow.window = mockWindow;
  mockWindow.self = mockWindow;
  mockWindow.global = mockWindow;

  // Run the VM inside the sandboxed browser-like context
  const sandboxFunc = new Function(
    'window', 'document', 'location', 'navigator', 'fetch', 'self', 'global',
    processedJs
  );
  
  const prevGlobalIo = (global as any).io;
  sandboxFunc(mockWindow, mockDocument, mockLocation, mockNavigator, mockFetch, mockWindow, mockWindow);
  const ioFunc = (global as any).io;
  // Restore the original global scope variable
  (global as any).io = prevGlobalIo;

  if (typeof ioFunc !== 'function') {
    throw new Error('VM failed to initialize the Axios builder function');
  }

  // Create a mock Axios client for VM to hook into
  const mockAxios: any = {
    interceptors: {
      request: {
        use: (success: any) => { mockAxios.requestInterceptor = success; }
      },
      response: {
        use: (success: any) => { mockAxios.responseInterceptor = success; }
      }
    },
    defaults: {
      headers: {
        common: {}
      }
    }
  };

  // Register the Axios client with the VM to populate request/response interceptors
  ioFunc(mockAxios);

  if (!mockAxios.requestInterceptor || !mockAxios.responseInterceptor) {
    throw new Error('VM failed to register Axios request/response interceptors');
  }

  return {
    async getSignature() {
      const config = { url: `/chapters/${chapterId}`, headers: {} };
      const resConfig = await mockAxios.requestInterceptor(config);
      return resConfig.params?._ || '';
    },
    async decryptResponse(encryptedData: any) {
      const rawResponse = {
        data: encryptedData,
        headers: { 'x-enc': '1' }, // Signals VM to trigger decryption
        config: {
          url: `/chapters/${chapterId}`,
          baseURL: '/api/v1',
          method: 'get'
        }
      };
      const res = await mockAxios.responseInterceptor(rawResponse);
      return res.data;
    }
  };
}
