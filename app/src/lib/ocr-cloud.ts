import { ImageAnnotatorClient } from "@google-cloud/vision";

let visionClient: ImageAnnotatorClient | null = null;

function getClient(): ImageAnnotatorClient {
  if (!visionClient) {
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_CLOUD_VISION_API_KEY environment variable not set");
    }
    visionClient = new ImageAnnotatorClient({
      apiKey,
    });
  }
  return visionClient;
}

export async function extractTextWithCloudVision(imageBuffer: Buffer): Promise<string> {
  const client = getClient();
  const [result] = await client.textDetection({
    image: { content: imageBuffer },
  });

  const detections = result.textAnnotations;
  if (!detections || detections.length === 0) {
    return "";
  }

  // First annotation contains all detected text
  return detections[0]?.description || "";
}

