export interface Folklore {
  id: number | string;
  name: string;
  month?: number;
  date: string;
  loc: string;
  lat: number;
  lng: number;
  desc: string;
  img: string;
  video?: string;
  isUserContribution?: boolean;
}

export interface UserContribution extends Folklore {
  userId: string;
  userName?: string;
  mediaType?: 'image' | 'video';
  createdAt: any;
}
