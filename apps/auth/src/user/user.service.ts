import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './user.repository';
import * as bcrypt from 'bcryptjs';
import { GetUserDto } from './dto/get-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}
  async create(createUserDto: CreateUserDto) {
    await this.validateCreateUserDto(createUserDto);
    const saltRounds = 12; // Increased from 10 for better security
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds); // Use async version
    return this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
  }

  getUser(getUserDto: GetUserDto) {
    return this.userRepository.findOne({ _id: getUserDto.id });
  }
  async verifyUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  private async validateCreateUserDto(createUserDto: CreateUserDto) {
    try {
      await this.userRepository.findOne({ email: createUserDto.email });
    } catch (error) {
      return;
    }
    throw new UnprocessableEntityException(
      `User with email ${createUserDto.email} already exists`,
    );
    /*if (!createUserDto.email || !createUserDto.password) {
      throw new UnauthorizedException('Email and password are required');
    }
    if (createUserDto.password.length < 6) {
      throw new UnauthorizedException(
        'Password must be at least 6 characters long',
      );
    }*/
  }
}
