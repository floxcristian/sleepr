import { Injectable } from '@nestjs/common';
import { UserDocument } from './user/schemas/user.schema';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(user: UserDocument, response: Response): Promise<void> {
    const tokenPayload = { userId: user._id.toHexString(), email: user.email };
    const expires = new Date();
    expires.setSeconds(
      expires.getSeconds() +
        // CORREGIR ESTO?
        this.configService.get<number>('JWT_EXPIRATION_TIME', 3600), // Default to 1 hour if not set
    );
    const token = this.jwtService.sign(tokenPayload);
    response.cookie('Authentication', token, {
      httpOnly: true,
      //secure: this.configService.get<boolean>('JWT_SECURE_COOKIE', false), // Use secure cookies based on config
      expires, // Set the cookie expiration based on the token expiration
    });
  }
}
