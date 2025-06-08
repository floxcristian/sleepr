/**
 * Quizás esto se puede mejorar. Al ser un abstract repository creo que no debería depender de mongoose.
 * Quizás debería ser un repository genérico que reciba un modelo genérico.
 * Pero por ahora lo dejo así.
 * Quizás en el futuro se pueda hacer un repository genérico que reciba un modelo genérico.
 * Quizás se pueda hacer un repository genérico que reciba un modelo genérico y un tipo de documento genérico.
 */

import { FilterQuery, Model, UpdateQuery } from 'mongoose';
import { AbstractDocument } from './abstract.schema';
import { Logger, NotFoundException } from '@nestjs/common';

export abstract class AbstractRepository<TDocument extends AbstractDocument> {
  protected abstract readonly logger: Logger;

  constructor(protected readonly model: Model<TDocument>) {}

  async create(document: Omit<TDocument, '_id'>): Promise<TDocument> {
    const createdDocument = new this.model(document);
    /* VIDEOTUTORIAL:
    const createdDocument = new this.model({
      ...document,
      _id: new Types.ObjectId(),
    });*/
    // this.logger.log(`Creating document: ${JSON.stringify(createdDocument)}`);
    const savedDocument = await createdDocument.save();
    return savedDocument.toJSON() as TDocument;
  }

  async findOne(filterQuery: FilterQuery<TDocument>): Promise<TDocument> {
    // this.logger.log(`Finding one document with filter: ${JSON.stringify(filterQuery)}`);
    const document = await this.model
      .findOne(filterQuery)
      .lean<TDocument>(true);

    if (!document) {
      this.logger.warn(`Document not found for filterQuery: ${filterQuery}`);
      throw new NotFoundException(`Document not found `);
    }
    return document;
    /*return document ? (document.toJSON() as TDocument) : null;*/
  }

  async findOneAndUpdate(
    filterQuery: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
  ): Promise<TDocument> {
    // this.logger.log(`Finding and updating document with filter: ${JSON.stringify(filterQuery)} and update: ${JSON.stringify(update)}`);
    const updatedDocument = await this.model
      .findOneAndUpdate(filterQuery, update, {
        new: true, // Return the updated document
      })
      .lean<TDocument>(true);
    if (!updatedDocument) {
      this.logger.warn(`Document not found for filterQuery: ${filterQuery}`);
      throw new NotFoundException(
        `Document not found for filterQuery: ${filterQuery}`,
      );
    }
    return updatedDocument as TDocument;
  }

  async find(filterQuery: FilterQuery<TDocument>): Promise<TDocument[]> {
    // this.logger.log(`Finding documents with filter: ${JSON.stringify(filterQuery)}`);
    return this.model.find(filterQuery).lean<TDocument[]>(true);
  }

  async findOneAndDelete(
    filterQuery: FilterQuery<TDocument>,
  ): Promise<TDocument> {
    // this.logger.log(`Finding and deleting document with filter: ${JSON.stringify(filterQuery)}`);
    const deletedDocument = await this.model
      .findOneAndDelete(filterQuery)
      .lean<TDocument>(true);
    // this.logger.log(`Deleted document: ${JSON.stringify(deletedDocument)}`);
    if (!deletedDocument) {
      this.logger.warn(`Document not found for filterQuery: ${filterQuery}`);
      throw new NotFoundException(
        `Document not found for filterQuery: ${filterQuery}`,
      );
    }
    return deletedDocument;
  }
}
