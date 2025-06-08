import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './user.repository';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  create(createUserDto: CreateUserDto) {
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(createUserDto.password, saltRounds);
    return this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
  }

  async verifyUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ email });
    if (user && bcrypt.compareSync(password, user.password)) {
      return user;
    }
    throw new UnauthorizedException('Invalid credentials');
  }
}
