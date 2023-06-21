export class UserIntegration {
  telegram?: Connection;
  discord?: Connection;
}

export class Connection {
  id: string;
  username: string;
  avatar: string;
}
