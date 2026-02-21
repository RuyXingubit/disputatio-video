import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { randomUUID } from "crypto"

const BUCKET = "disputatio-videos"

export function createMinioClient(ipv4: string, accessKey: string, secretKey: string) {
    return new S3Client({
        region: "us-east-1",
        endpoint: `http://${ipv4}:9000`,
        forcePathStyle: true,
        credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
        },
    })
}

export async function generateUploadUrl(
    ipv4: string,
    accessKey: string,
    secretKey: string,
    contentType: string,
    fileKey?: string,
) {
    const client = createMinioClient(ipv4, accessKey, secretKey)
    const key = fileKey ?? `${randomUUID()}`

    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 })

    return { uploadUrl, fileKey: key }
}

export function buildPublicUrl(ipv4: string, fileKey: string) {
    return `http://${ipv4}:9000/${BUCKET}/${fileKey}`
}
