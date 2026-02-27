import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_BUCKET = process.env.S3_BUCKET!;
const S3_PREFIX = process.env.S3_PREFIX ?? "triplecomma-backoffice/";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadDocument(
  file: Buffer,
  filename: string,
  licenseId: number,
): Promise<string> {
  const sanitized = sanitizeFilename(filename);
  const key = `${S3_PREFIX}documents/${licenseId}/${Date.now()}_${sanitized}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file,
    }),
  );

  return key;
}

export async function getPresignedUrl(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
  });

  return getSignedUrl(getClient(), command, { expiresIn: 300 });
}

export async function deleteS3Object(s3Key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
    }),
  );
}

export async function uploadReport(
  file: Buffer,
  period: string,
): Promise<string> {
  const key = `${S3_PREFIX}reports/${period}.pdf`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file,
    }),
  );

  return key;
}
