import { fetchRooms } from '../../../api';
import RoomAvailabilityClient from '../../../components/rooms/Roomavailabilityclient';

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ date?: string }>;
}

// export async function generateMetadata({ params }: Props) {
//     try {
//         const { id } = await params;
//         const rooms = await fetchRooms();
//         const room = rooms.find((r) => r._id === id);
//         return { title: room ? `${room.name} — RoomBook` : "Room — RoomBook" };
//     } catch {
//         return { title: "Room — RoomBook" };
//     }
// }

export default async function RoomPage({ params, searchParams }: Props) {
    const { id } = await params;
    const { date } = await searchParams;


    return (
        <RoomAvailabilityClient
            roomId={id}
            initialDate={date}
        />
    );
}