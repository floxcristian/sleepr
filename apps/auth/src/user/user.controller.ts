import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { CurrentUser } from '@app/common';
import { PassportJwtAuthGuard } from '../guards';
import { UserDocument } from '@app/common';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto): Promise<any> {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(PassportJwtAuthGuard)
  async getUser(@CurrentUser() user: UserDocument): Promise<UserDocument> {
    return user;
  }
}
