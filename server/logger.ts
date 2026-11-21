import fs from "fs";
import path from "path";
import { AsyncLocalStorage } from "async_hooks";
import winston from "winston";

// Diretório relativo ao projeto com permissão de escrita em hospedagem compartilhada cPanel
const LOG_DIR = path.resolve(process.cwd(), "logs");
export const LOG_FILE_PATH = path.join(LOG_DIR, "app-security-audit.log");

// Garante criação segura da pasta ./logs sem quebrar a inicialização em caso de FS restrito
let fileTransportEnabled = false;
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  fs.accessSync(LOG_DIR, fs.constants.W_OK);
  fileTransportEnabled = true;
} catch (err) {
  console.warn("[Logger] Diretório ./logs sem permissão de escrita. Usando apenas Console transport.", err);
}

// AsyncLocalStorage para rastreamento automático de Request-ID, User-ID e Action
export interface LogStore {
  requestId?: string;
  userId?: string;
  action?: string;
}

export const logContextStorage = new AsyncLocalStorage<LogStore>();

// Anonimização de IP para conformidade LGPD
export function anonymizeIp(ip: string | undefined): string {
  if (!ip) return "0.0.0.0";
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length > 2) {
      return `${parts[0]}:${parts[1]}:xxxx:xxxx::`;
    }
    return "::1";
  }
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  return "xxx.xxx.xxx.xxx";
}

// Mascaramento recursivo de dados sensíveis e chaves de API
export function maskSensitiveData(obj: unknown, seen = new WeakSet<object>()): unknown {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "object") {
    if (seen.has(obj)) {
      return "[Circular]";
    }
    seen.add(obj);
  }

  if (obj instanceof Error) {
    return {
      message: obj.message,
      stack: obj.stack,
      name: obj.name,
    };
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveData(item, seen));
  }

  if (typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("password") ||
        lowerKey.includes("senha") ||
        lowerKey.includes("token") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("apikey") ||
        lowerKey.includes("api_key") ||
        lowerKey === "key" ||
        lowerKey.includes("authorization") ||
        lowerKey.includes("cookie") ||
        lowerKey.includes("credential") ||
        lowerKey.includes("email") ||
        lowerKey.includes("cpf") ||
        lowerKey.includes("telefone") ||
        lowerKey.includes("phone") ||
        lowerKey.includes("x-admin-token")
      ) {
        result[key] = "[MASKED_CONFIDENTIAL_DATA]";
      } else {
        result[key] = maskSensitiveData(record[key], seen);
      }
    }
    return result;
  }

  if (typeof obj === "string") {
    if (/AIzaSy[A-Za-z0-9_-]{33}/.test(obj)) {
      return obj.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, "[MASKED_API_KEY]");
    }
    if (obj.toLowerCase().startsWith("bearer ")) {
      return "Bearer [MASKED_TOKEN]";
    }
  }

  return obj;
}

const { createLogger, format, transports } = winston;

const maskFormat = format((info) => {
  const masked = maskSensitiveData(info) as Record<string, unknown>;
  for (const key of Object.keys(masked)) {
    info[key] = masked[key];
  }
  return info;
});

const activeTransports: winston.transport[] = [
  new transports.Console({
    format: format.combine(
      maskFormat(),
      format.colorize(),
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
        return `[${timestamp}] ${level}: ${message} ${metaStr}`;
      })
    ),
  }),
];

if (fileTransportEnabled) {
  activeTransports.unshift(
    new transports.File({
      filename: LOG_FILE_PATH,
      // Rotação automática para evitar lotação de disco no cPanel (máx. 5 arquivos x 5 MB = 25 MB)
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    })
  );
}

const winstonLogger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(maskFormat(), format.timestamp(), format.json()),
  transports: activeTransports,
});

export interface LogContext {
  userId?: string;
  action?: string;
  requestId?: string;
  source?: "frontend" | "backend";
  ip?: string;
  [key: string]: unknown;
}

export const logger = {
  info(message: string, context: LogContext = {}) {
    const store = logContextStorage.getStore() || {};
    winstonLogger.info(message, {
      source: "backend",
      ...store,
      ...context,
    });
  },

  warn(message: string, context: LogContext = {}) {
    const store = logContextStorage.getStore() || {};
    winstonLogger.warn(message, {
      source: "backend",
      ...store,
      ...context,
    });
  },

  error(message: string, context: LogContext = {}) {
    const store = logContextStorage.getStore() || {};
    winstonLogger.error(message, {
      source: "backend",
      ...store,
      ...context,
    });
  },

  fatal(message: string, context: LogContext = {}) {
    const store = logContextStorage.getStore() || {};
    winstonLogger.error(`[FATAL] ${message}`, {
      source: "backend",
      severity: "fatal",
      ...store,
      ...context,
    });
  },

  securityAlert(message: string, context: LogContext = {}) {
    const store = logContextStorage.getStore() || {};
    winstonLogger.warn(`[SECURITY_ALERT] ${message}`, {
      source: "backend",
      severity: "security_alert",
      ...store,
      ...context,
    });
  },
};

export function writeAuditLog(
  level: "INFO" | "WARN" | "ERROR" | "SECURITY_ALERT",
  source: "frontend" | "backend",
  message: string,
  ipRaw: string | undefined,
  context: Record<string, unknown> = {}
) {
  const ip = anonymizeIp(ipRaw);
  const contextWithIp: LogContext = { ip, ...context, source };

  if (level === "INFO") {
    logger.info(message, contextWithIp);
  } else if (level === "WARN") {
    logger.warn(message, contextWithIp);
  } else if (level === "ERROR") {
    logger.error(message, contextWithIp);
  } else if (level === "SECURITY_ALERT") {
    logger.securityAlert(message, contextWithIp);
  }
}
