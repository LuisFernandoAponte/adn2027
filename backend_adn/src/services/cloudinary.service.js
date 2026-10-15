import crypto from 'crypto';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

/**
 * Sube una imagen en base64 o buffer a Cloudinary usando REST API nativa con firma HMAC SHA1
 */
export const subirFotoCloudinary = async (base64Image, folder = 'adn_motors_respaldos') => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    const formData = new URLSearchParams();
    formData.append('file', base64Image);
    formData.append('api_key', API_KEY);
    formData.append('timestamp', timestamp.toString());
    formData.append('folder', folder);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error al subir imagen a Cloudinary');
    }

    return {
      url: data.secure_url,
      public_id: data.public_id
    };
  } catch (error) {
    console.error('Error Cloudinary Upload:', error);
    throw error;
  }
};
