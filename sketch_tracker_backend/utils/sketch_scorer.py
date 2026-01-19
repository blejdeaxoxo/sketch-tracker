import sys
import cv2
import numpy as np

# --- CONFIGURATION ---
DEBUG = True
SIZE = 300
TOLERANCE_RADIUS = 8 

def log(msg):
    sys.stderr.write(f"[Python] {msg}\n")

def save_debug(name, img):
    if DEBUG:
        if img is None: return
        if img.dtype == bool: img = (img * 255).astype(np.uint8)
        elif img.dtype != np.uint8: img = (img).astype(np.uint8)
        cv2.imwrite(name, img)

def robust_binarize(image, name_suffix):
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(image)
    blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 41, 10
    )
    white_pixels = cv2.countNonZero(thresh)
    total_pixels = thresh.shape[0] * thresh.shape[1]
    if white_pixels > (total_pixels / 2):
        thresh = cv2.bitwise_not(thresh)
    save_debug(f"debug_binarized_{name_suffix}.png", thresh)
    return thresh

def crop_and_resize(binary_img):
    coords = cv2.findNonZero(binary_img)
    if coords is None: return None
    x, y, w, h = cv2.boundingRect(coords)
    if w < 10 or h < 10: return None
    crop = binary_img[y:y+h, x:x+w]
    resized = cv2.resize(crop, (SIZE, SIZE), interpolation=cv2.INTER_AREA)
    _, resized_binary = cv2.threshold(resized, 127, 255, cv2.THRESH_BINARY)
    kernel = np.ones((2,2), np.uint8)
    final = cv2.dilate(resized_binary, kernel, iterations=1)
    return final

def main():
    try:
        if len(sys.argv) < 3:
            print("0")
            return
        
        ref_path = sys.argv[1]
        snap_path = sys.argv[2]
        ref_raw = cv2.imread(ref_path, cv2.IMREAD_GRAYSCALE)
        snap_raw = cv2.imread(snap_path, cv2.IMREAD_GRAYSCALE)

        if ref_raw is None or snap_raw is None:
            print("0")
            return

        ref_bin = robust_binarize(ref_raw, "ref")
        snap_bin = robust_binarize(snap_raw, "snap")
        ref_ready = crop_and_resize(ref_bin)
        snap_ready = crop_and_resize(snap_bin)

        if ref_ready is None or snap_ready is None:
            print("0")
            return

        save_debug("debug_ready_ref.png", ref_ready)
        save_debug("debug_ready_snap.png", snap_ready)

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (TOLERANCE_RADIUS, TOLERANCE_RADIUS))
        ref_safe_zone = cv2.dilate(ref_ready, kernel, iterations=1)
        snap_safe_zone = cv2.dilate(snap_ready, kernel, iterations=1)

        user_pixels = cv2.countNonZero(snap_ready)
        ref_pixels = cv2.countNonZero(ref_ready)
        
        # --- METRICS ---
        
        valid_user_ink = cv2.bitwise_and(snap_ready, ref_safe_zone)
        precision = cv2.countNonZero(valid_user_ink) / max(1, user_pixels)
        log(f"Precision: {precision:.2f}")

        covered_ref_ink = cv2.bitwise_and(ref_ready, snap_safe_zone)
        recall = cv2.countNonZero(covered_ref_ink) / max(1, ref_pixels)
        log(f"Recall: {recall:.2f}")
        
        ink_ratio = user_pixels / max(1, ref_pixels)
        log(f"Ink Ratio: {ink_ratio:.2f}")

        # --- SCORING ENGINE ---

        # 1. BASELINE: Recall is the driver.
        score = recall
        
        # 2. EFFICIENCY PENALTY
        efficiency_factor = 1.5 / max(1.5, ink_ratio)
        if efficiency_factor < 1.0:
            log(f"Efficiency Penalty: {efficiency_factor:.2f}")
            score *= efficiency_factor

        # 3. MESSINESS PENALTY
        if precision < 0.5:
            penalty = precision / 0.5
            log(f"Messiness Penalty: {penalty:.2f}")
            score *= penalty

        # 4. DYNAMIC QUALITY BOOST (The Fix)
        # Instead of a flat 15% bonus, the bonus depends on how much you drew (Recall).
        # Precision > 0.85 enables the bonus.
        # Recall 0.20 -> Bonus is +3% (Tiny)
        # Recall 0.90 -> Bonus is +13.5% (Huge)
        
        if precision > 0.85:
            # Linear scaling: 1.0 + (0.15 * Recall)
            bonus_factor = 1.0 + (0.15 * recall)
            log(f"Dynamic Precision Bonus: x{bonus_factor:.2f}")
            score *= bonus_factor

        # 5. FINAL CURVE
        # Boost near-complete drawings to 100%
        if score > 0.85:
            score = pow(score, 0.5)
        
        # Clamp
        final_score = min(score, 1.0)

        log(f"Final Score: {final_score:.4f}")
        print(f"{final_score:.4f}")

    except Exception as e:
        log(f"CRASH: {str(e)}")
        print("0")

if __name__ == "__main__":
    main()