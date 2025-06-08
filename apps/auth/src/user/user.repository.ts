import { AbstractRepository } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { UserDocument } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UserRepository extends AbstractRepository<UserDocument> {
  protected readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectModel(UserDocument.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }

  /*async createUser(email: string, password: string): Promise<UserDocument> {
    const user = new this.entityClass();
    user.email = email;
    user.password = password;
    return this.create(user);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.findOne({ email });
  }*/
}
