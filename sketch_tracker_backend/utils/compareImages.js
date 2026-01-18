const sharp = require('sharp');
const path = require('path');

async function getSimilarityScore(referencePath, snapshotPath) {
  try {
    const absRefPath = path.resolve(referencePath);
    const absSnapPath = path.resolve(snapshotPath);

    /**
     * HELPER: The Shape Extractor
     */
    async function getShapeMap(imagePath, isReference) {
      const instance = sharp(imagePath);
      const metadata = await instance.metadata();
      const imgWidth = metadata.width;
      const imgHeight = metadata.height;

      // 1. Pre-process to find Ink
      let pipeline = instance.clone().grayscale().normalize();

      if (isReference) {
        pipeline.threshold(128).negate(); 
      } else {
        pipeline.sharpen().linear(3.0, 0).threshold(30).negate(); 
      }

      const { data } = await pipeline.raw().toBuffer({ resolveWithObject: true });

      // 2. Find Ink Bounds
      let minX = imgWidth, minY = imgHeight, maxX = 0, maxY = 0;
      let hasInk = false;

      for (let i = 0; i < data.length; i++) {
        if (data[i] === 255) {
          hasInk = true;
          const x = i % imgWidth;
          const y = Math.floor(i / imgWidth);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      const inkWidth = maxX - minX;
      const inkHeight = maxY - minY;
      if (!hasInk || inkWidth < 5 || inkHeight < 5) return null;

      // 3. Crash-Proof Crop
      const padding = 10;
      const safeLeft = Math.max(0, minX - padding);
      const safeTop = Math.max(0, minY - padding);
      const safeRight = Math.min(imgWidth, maxX + padding);
      const safeBottom = Math.min(imgHeight, maxY + padding);
      const safeWidth = safeRight - safeLeft;
      const safeHeight = safeBottom - safeTop;

      if (safeWidth <= 0 || safeHeight <= 0) return null;

      // 4. Extract, Resize & HEAVY BLUR
      // We increased blur to 5. This makes the math look at "General Composition"
      // instead of "Specific Lines".
      let processed = sharp(imagePath)
        .grayscale()
        .extract({ left: safeLeft, top: safeTop, width: safeWidth, height: safeHeight })
        .resize(64, 64, { fit: 'fill' }) 
        .normalize();

      if (isReference) {
        // Blur 5 = Very tolerant of wobbles
        processed = processed.threshold(128).negate().blur(5); 
      } else {
        processed = processed.sharpen().linear(3.0, 0).threshold(40).blur(5);
      }

      const debugName = isReference ? 'debug_blob_ref.png' : 'debug_blob_snap.png';
      await processed.clone().toFile(debugName);

      return processed.raw().toBuffer();
    }

    console.log("Generating Shape Maps...");
    const refBuffer = await getShapeMap(absRefPath, true);
    const snapBuffer = await getShapeMap(absSnapPath, false);

    if (!refBuffer || !snapBuffer) {
      console.log("Result: BLANK (0.0)");
      return 0;
    }

    // --- SCORING ---
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < refBuffer.length; i++) {
      const valA = refBuffer[i];
      const valB = snapBuffer[i];

      dotProduct += valA * valB;
      magnitudeA += valA * valA;
      magnitudeB += valB * valB;
    }

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    const similarity = dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));

    // --- AGGRESSIVE BOOST ---
    // Old: 0.2 power. New: 0.15 power.
    // If your raw match is ~0.50 (decent):
    // Old Score: 0.87
    // New Score: 0.90
    
    // If your raw match is ~0.60 (good):
    // Old Score: 0.90
    // New Score: 0.93
    
    let finalScore = Math.pow(similarity, 0.15);

    finalScore = Math.min(finalScore, 1.0);

    console.log(`Raw: ${similarity.toFixed(4)} -> Final: ${finalScore.toFixed(4)}`);
    return finalScore;

  } catch (err) {
    console.error('Error in scoring:', err);
    return 0;
  }
}

module.exports = getSimilarityScore;