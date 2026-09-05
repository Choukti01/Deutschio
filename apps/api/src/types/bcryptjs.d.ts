declare module "bcryptjs" {
  const bcrypt: {
    hash(value: string, rounds: number): Promise<string>;
    compare(value: string, encryptedValue: string): Promise<boolean>;
  };

  export default bcrypt;
}
