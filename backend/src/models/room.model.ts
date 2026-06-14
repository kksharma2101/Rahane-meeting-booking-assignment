import { Schema, model, Document } from 'mongoose';

export interface IRoomDocument extends Document {
    name: string;
    location: string;
    floor: string;
    capacity: number;
    amenities: string[];
    createdAt: Date;
    updatedAt: Date;
}

const RoomSchema = new Schema<IRoomDocument>(
    {
        name: {
            type: String,
            required: [true, 'Room name is required'],
            unique: true,
            trim: true,
            maxlength: [100, 'Room name cannot exceed 100 characters'],
        },
        location: {
            type: String,
            required: [true, 'Location is required'],
            trim: true,
        },
        floor: {
            type: String,
            required: [true, 'Floor is required'],
            trim: true,
        },
        capacity: {
            type: Number,
            required: [true, 'Capacity is required'],
            min: [1, 'Capacity must be at least 1'],
        },
        amenities: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

export const Room = model<IRoomDocument>('Room', RoomSchema);