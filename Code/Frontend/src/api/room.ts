import { api } from './client';
import type { RoomMetrics } from '../types/metrics';

export async function fetchCurrentRoomMetrics(babyId: number): Promise<RoomMetrics> {
  const res = await api.get<RoomMetrics>('/room/current', {
    params: { baby_id: babyId }
  });
  return res.data;
}
