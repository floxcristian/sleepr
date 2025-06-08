import { Prop, Schema } from '@nestjs/mongoose';

import { SchemaTypes, Types } from 'mongoose';

@Schema()
export class AbstractDocument {
  @Prop({ type: SchemaTypes.ObjectId, auto: true })
  _id: Types.ObjectId;
  /*_id: string;
  createdAt: Date;
  updatedAt: Date;

  constructor() {
    this._id = new Date().getTime().toString();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }*/
}
