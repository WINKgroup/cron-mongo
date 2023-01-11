import mongoose, { Document } from 'mongoose';

export interface ICron {
    _id: string
    everySeconds: number
    waitUntil: string
}

export interface ICronDoc extends ICron, Document {
    _id: string
}

export interface ICronModel extends mongoose.Model<ICronDoc> {}

export const schema = new mongoose.Schema<ICronDoc, ICronModel>({
    everySeconds: { type: Number, required: true },
    waitUntil: String
});
