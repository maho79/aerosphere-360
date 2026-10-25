import QRCode from 'qrcode';
import { formatCoordinates } from './geo';

export interface PanoramaWatermarkOptions {
  canvasWidth: number;
  canvasHeight: number;
  shareUrl: string;
  title?: string;
  country?: string;
  date?: string;
  lat?: number | null;
  lon?: number | null;
  position?: 'bottom-right' | 'center-sky';
}

/**
 * Draws an elegant Glass-Noir metadata badge on a 2D canvas context.
 * Includes: QR Code, Compass icon, Title • Country, Date, GPS coordinates (lat°, lon°), and share URL.
 *
 * Positions:
 * - 'bottom-right': Used for 4K Perspective Views and Little Planet exports.
 * - 'center-sky': Used for full-resolution equirectangular panorama downloads (exact horizontal center, upper sky).
 */
export async function drawPanoramaWatermark(
  ctx: CanvasRenderingContext2D,
  options: PanoramaWatermarkOptions
): Promise<void> {
  const {
    canvasWidth,
    canvasHeight,
    shareUrl,
    title = '360° Panorama',
    country,
    date,
    lat,
    lon,
    position = 'bottom-right',
  } = options;

  if (!shareUrl) return;

  try {
    // Determine scale relative to 4K reference (3840x2160 landscape or 2160x3840 portrait)
    const isPortrait = canvasWidth < canvasHeight;
    const refW = isPortrait ? 2160 : 3840;
    const refH = isPortrait ? 3840 : 2160;
    const baseDim = Math.min(canvasWidth / refW, canvasHeight / refH);
    const scale = Math.max(0.65, Math.min(baseDim * (isPortrait ? 0.85 : 1.0), 3.8));

    // Generate high-resolution QR code (320px for razor-sharp rendering)
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, shareUrl, {
      width: Math.round(320 * scale),
      margin: 1,
      color: {
        dark: '#090a0f',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });

    ctx.save();

    // Sizing & Spacing
    const qrDisplaySize = Math.round(144 * scale);
    const qrPadding = Math.round(10 * scale);
    const qrContainerSize = qrDisplaySize + qrPadding * 2; // ~164px at scale 1

    const paddingX = Math.round(26 * scale);
    const paddingY = Math.round(20 * scale);
    const gap = Math.round(26 * scale);

    const fontTitle = Math.round(28 * scale);
    const fontMeta = Math.round(19 * scale);
    const fontUrl = Math.round(22 * scale);
    const fontSub = Math.round(16 * scale);

    // Format title & country
    const cleanTitle = title && title !== 'Unknown' ? title : '360° Panorama';
    const cleanCountry = country && country !== 'Unknown' ? country : '';

    ctx.font = `bold ${fontTitle}px Inter, system-ui, -apple-system, sans-serif`;
    const titleWidth = ctx.measureText(cleanTitle).width;
    const countryWidth = cleanCountry ? ctx.measureText(` • ${cleanCountry}`).width : 0;
    const topLineWidth = titleWidth + countryWidth + Math.round(40 * scale); // with compass icon

    // Format GPS coordinates
    const hasGps = lat !== null && lon !== null && lat !== undefined && lon !== undefined && (lat !== 0 || lon !== 0);
    const gpsText = hasGps ? formatCoordinates(lat!, lon!) : '';
    const dateText = date || '';

    ctx.font = `500 ${fontMeta}px Inter, system-ui, -apple-system, sans-serif`;
    let metaLineWidth = 0;
    if (dateText) metaLineWidth += ctx.measureText(dateText).width + Math.round(18 * scale);
    if (gpsText) metaLineWidth += ctx.measureText(gpsText).width + Math.round(22 * scale);

    // Format URL
    ctx.font = `600 ${fontUrl}px Inter, system-ui, -apple-system, sans-serif`;
    const urlLineWidth = ctx.measureText(shareUrl).width;

    // Subtitle
    ctx.font = `500 ${fontSub}px Inter, system-ui, -apple-system, sans-serif`;
    const subLineWidth = ctx.measureText('Scan QR code with mobile camera for 360° view').width;

    const textWidth = Math.max(
      topLineWidth,
      metaLineWidth,
      urlLineWidth,
      subLineWidth,
      Math.round(360 * scale)
    );

    const badgeWidth = paddingX + qrContainerSize + gap + textWidth + paddingX;
    const badgeHeight = Math.max(qrContainerSize + paddingY * 2, Math.round(204 * scale));

    // Calculate Coordinates
    let badgeX: number;
    let badgeY: number;

    if (position === 'center-sky') {
      badgeX = Math.round((canvasWidth - badgeWidth) / 2);
      // In 2:1 equirectangular panorama, horizon is at 50%.
      // A bit up into the sky is ~37% of canvas height.
      badgeY = Math.round(canvasHeight * 0.37 - badgeHeight / 2);
    } else {
      // Bottom-right with margin
      const margin = Math.round(60 * scale);
      badgeX = canvasWidth - badgeWidth - margin;
      badgeY = canvasHeight - badgeHeight - margin;
    }

    const badgeRadius = Math.round(24 * scale);

    // 1. Draw Glass-Noir Card Background
    ctx.fillStyle = 'rgba(9, 10, 15, 0.88)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = Math.max(2, Math.round(2.5 * scale));
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = Math.round(28 * scale);
    ctx.shadowOffsetY = Math.round(10 * scale);

    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeRadius);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
      ctx.fill();
      ctx.stroke();
    }

    // Reset shadow for inner elements
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 2. Draw White QR Code Container
    const qrBoxX = badgeX + paddingX;
    const qrBoxY = badgeY + (badgeHeight - qrContainerSize) / 2;
    const qrBoxRadius = Math.round(16 * scale);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5 * scale;
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrContainerSize, qrContainerSize, qrBoxRadius);
      ctx.fill();
    } else {
      ctx.fillRect(qrBoxX, qrBoxY, qrContainerSize, qrContainerSize);
    }

    // 3. Draw QR Code into container
    ctx.drawImage(
      qrCanvas,
      qrBoxX + qrPadding,
      qrBoxY + qrPadding,
      qrDisplaySize,
      qrDisplaySize
    );

    // 4. Draw Metadata Details to the right of QR code
    const textStartX = qrBoxX + qrContainerSize + gap;
    const startY = badgeY + paddingY + Math.round(18 * scale);

    // --- Line 1: Compass Icon + Title • Country ---
    const iconX = textStartX + Math.round(14 * scale);
    const iconY = startY;
    const iconR = Math.round(13 * scale);

    // Compass circle
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconR, 0, Math.PI * 2);
    ctx.stroke();

    // Compass needle pointing NE (45°)
    const needleLen = iconR * 0.75;
    ctx.save();
    ctx.translate(iconX, iconY);
    ctx.rotate(Math.PI / 4);

    // North needle (cyan)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -needleLen);
    ctx.lineTo(needleLen * 0.45, 0);
    ctx.lineTo(0, 0);
    ctx.fill();

    // South needle (white)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, needleLen);
    ctx.lineTo(-needleLen * 0.45, 0);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.restore();

    // Title & Country text
    ctx.font = `bold ${fontTitle}px Inter, system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(cleanTitle, textStartX + Math.round(36 * scale), startY);

    if (cleanCountry) {
      const currentTitleWidth = ctx.measureText(cleanTitle).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(' • ', textStartX + Math.round(36 * scale) + currentTitleWidth, startY);
      const bulletWidth = ctx.measureText(' • ').width;

      ctx.font = `500 ${fontTitle}px Inter, system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(cleanCountry, textStartX + Math.round(36 * scale) + currentTitleWidth + bulletWidth, startY);
    }

    // --- Line 2: Date + GPS coordinates ---
    const line2Y = startY + Math.round(36 * scale);
    let currentX = textStartX;

    if (dateText) {
      ctx.font = `500 ${fontMeta}px Inter, system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#94a3b8';
      ctx.textBaseline = 'middle';
      ctx.fillText(dateText, currentX, line2Y);
      currentX += ctx.measureText(dateText).width + Math.round(18 * scale);
    }

    if (gpsText) {
      ctx.font = `600 ${fontMeta}px Inter, system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#38bdf8';
      ctx.textBaseline = 'middle';
      ctx.fillText(gpsText, currentX, line2Y);
      currentX += ctx.measureText(gpsText).width + Math.round(6 * scale);

      // External link arrow icon
      ctx.font = `600 ${Math.round(fontMeta * 0.85)}px Inter, system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('↗', currentX, line2Y - Math.round(2 * scale));
    }

    // --- Line 3: Clean Panorama Share URL ---
    const line3Y = line2Y + Math.round(38 * scale);
    ctx.font = `600 ${fontUrl}px Inter, system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(shareUrl, textStartX, line3Y);

    // --- Line 4: Scan instruction ---
    const line4Y = line3Y + Math.round(30 * scale);
    ctx.font = `500 ${fontSub}px Inter, system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#64748b';
    ctx.textBaseline = 'middle';
    ctx.fillText('Scan QR code with mobile camera for 360° view', textStartX, line4Y);

    ctx.restore();
  } catch (err) {
    console.warn('Failed to draw watermark:', err);
  }
}
