export class CreateUserDto {
  username!: string;
  password!: string;
  displayName!: string;
  mobile?: string;
  email?: string;
  roleIds?: string[];
  campusIds?: string[];
  status?: string;
}
