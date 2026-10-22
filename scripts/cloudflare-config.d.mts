export function readCloudflareConfig(): Promise<{
  account_id?: string;
  d1_databases?: { binding: string; database_id?: string }[];
}>;
