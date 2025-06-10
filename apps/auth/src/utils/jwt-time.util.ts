import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class JwtTimeUtil {
  private static readonly logger = new Logger(JwtTimeUtil.name);

  static parseJwtExpirationToSeconds(timeString: string): number {
    // Si es un número, asumimos que está en segundos
    if (!isNaN(Number(timeString))) {
      const seconds = Number(timeString);
      if (seconds <= 0) {
        throw new Error('JWT_EXPIRATION must be a positive number');
      }
      return seconds;
    }

    // Si es un string con formato tiempo (ej: '1h', '60s', '1d')
    return this.parseTimeStringToSeconds(timeString);
  }

  private static parseTimeStringToSeconds(timeString: string): number {
    const match = timeString.match(/^(\d+)([smhd]?)$/);
    if (!match) {
      const error = `Invalid JWT_EXPIRATION format: "${timeString}". Expected: "3600", "1h", "30m", "60s", "1d"`;
      this.logger.error(error);
      throw new Error(error);
    }

    const value = parseInt(match[1]);
    if (value <= 0) {
      throw new Error('JWT_EXPIRATION value must be positive');
    }

    const unit = match[2];
    const jwtMultipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    if (!(unit in jwtMultipliers)) {
      throw new Error(
        `Invalid JWT time unit: "${unit}". Supported: s, m, h, d`,
      );
    }

    return value * jwtMultipliers[unit as keyof typeof jwtMultipliers];
  }
}
