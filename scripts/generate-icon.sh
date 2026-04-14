#!/bin/bash
# Generate macOS .icns icon from a programmatically created PNG
# Uses Java to render the icon, then iconutil to create .icns

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ICON_DIR="$PROJECT_DIR/src/main/resources/icons"
ICONSET_DIR="/tmp/TextEditor.iconset"

mkdir -p "$ICON_DIR"
mkdir -p "$ICONSET_DIR"

# Create a simple icon using Java
cat > /tmp/IconGenerator.java << 'JAVA'
import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.geom.RoundRectangle2D;
import javax.imageio.ImageIO;
import java.io.File;

public class IconGenerator {
    public static void main(String[] args) throws Exception {
        int[] sizes = {16, 32, 64, 128, 256, 512, 1024};
        for (int size : sizes) {
            BufferedImage img = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

            float s = size;
            float pad = s * 0.05f;
            float r = s * 0.18f;

            // Background rounded rectangle - dark blue gradient
            GradientPaint bg = new GradientPaint(0, 0, new Color(30, 60, 120), s, s, new Color(20, 40, 80));
            g.setPaint(bg);
            g.fill(new RoundRectangle2D.Float(pad, pad, s - 2*pad, s - 2*pad, r, r));

            // Inner shadow/border
            g.setColor(new Color(60, 100, 180, 80));
            g.setStroke(new BasicStroke(Math.max(1, s * 0.015f)));
            g.draw(new RoundRectangle2D.Float(pad, pad, s - 2*pad, s - 2*pad, r, r));

            // Document shape (white)
            float docX = s * 0.22f, docY = s * 0.15f;
            float docW = s * 0.56f, docH = s * 0.7f;
            float fold = s * 0.14f;
            int[] xPoints = {(int)docX, (int)(docX+docW-fold), (int)(docX+docW), (int)(docX+docW), (int)docX};
            int[] yPoints = {(int)docY, (int)docY, (int)(docY+fold), (int)(docY+docH), (int)(docY+docH)};
            g.setColor(new Color(240, 240, 245));
            g.fillPolygon(xPoints, yPoints, 5);

            // Fold triangle
            g.setColor(new Color(200, 210, 225));
            int[] fxPoints = {(int)(docX+docW-fold), (int)(docX+docW), (int)(docX+docW-fold)};
            int[] fyPoints = {(int)docY, (int)(docY+fold), (int)(docY+fold)};
            g.fillPolygon(fxPoints, fyPoints, 3);

            // Text lines
            float lineY = docY + fold + s * 0.08f;
            float lineX = docX + s * 0.06f;
            float lineMaxW = docW - s * 0.12f;
            float lineH = Math.max(1.5f, s * 0.025f);
            float lineGap = Math.max(3, s * 0.055f);

            // Markdown header line (blue)
            g.setColor(new Color(60, 120, 200));
            g.fillRoundRect((int)lineX, (int)lineY, (int)(lineMaxW * 0.6f), (int)(lineH * 1.5f), 2, 2);
            lineY += lineGap * 1.3f;

            // Regular lines (gray)
            float[] widths = {0.9f, 0.75f, 0.85f, 0.5f, 0.7f, 0.65f};
            for (float w : widths) {
                g.setColor(new Color(160, 170, 185));
                g.fillRoundRect((int)lineX, (int)lineY, (int)(lineMaxW * w), (int)lineH, 1, 1);
                lineY += lineGap;
                if (lineY > docY + docH - s * 0.05f) break;
            }

            // "MD" badge at bottom-right
            if (size >= 64) {
                float badgeS = s * 0.22f;
                float badgeX = s - pad - badgeS - s*0.02f;
                float badgeY = s - pad - badgeS - s*0.02f;
                g.setColor(new Color(0, 150, 100));
                g.fillRoundRect((int)badgeX, (int)badgeY, (int)badgeS, (int)badgeS, (int)(badgeS*0.3f), (int)(badgeS*0.3f));
                g.setColor(Color.WHITE);
                g.setFont(new Font("Helvetica", Font.BOLD, (int)(badgeS * 0.5f)));
                FontMetrics fm = g.getFontMetrics();
                String md = "MD";
                g.drawString(md, badgeX + (badgeS - fm.stringWidth(md))/2, badgeY + badgeS/2 + fm.getAscent()/3);
            }

            g.dispose();
            ImageIO.write(img, "png", new File(args[0] + "/icon_" + size + ".png"));
        }
    }
}
JAVA

javac /tmp/IconGenerator.java -d /tmp
java -cp /tmp IconGenerator "$ICONSET_DIR"

# Create iconset with proper naming
cp "$ICONSET_DIR/icon_16.png" "$ICONSET_DIR/icon_16x16.png"
cp "$ICONSET_DIR/icon_32.png" "$ICONSET_DIR/icon_16x16@2x.png"
cp "$ICONSET_DIR/icon_32.png" "$ICONSET_DIR/icon_32x32.png"
cp "$ICONSET_DIR/icon_64.png" "$ICONSET_DIR/icon_32x32@2x.png"
cp "$ICONSET_DIR/icon_128.png" "$ICONSET_DIR/icon_128x128.png"
cp "$ICONSET_DIR/icon_256.png" "$ICONSET_DIR/icon_128x128@2x.png"
cp "$ICONSET_DIR/icon_256.png" "$ICONSET_DIR/icon_256x256.png"
cp "$ICONSET_DIR/icon_512.png" "$ICONSET_DIR/icon_256x256@2x.png"
cp "$ICONSET_DIR/icon_512.png" "$ICONSET_DIR/icon_512x512.png"
cp "$ICONSET_DIR/icon_1024.png" "$ICONSET_DIR/icon_512x512@2x.png"

# Remove non-standard files
rm -f "$ICONSET_DIR/icon_16.png" "$ICONSET_DIR/icon_32.png" "$ICONSET_DIR/icon_64.png" \
      "$ICONSET_DIR/icon_128.png" "$ICONSET_DIR/icon_256.png" "$ICONSET_DIR/icon_512.png" \
      "$ICONSET_DIR/icon_1024.png"

# Create .icns
iconutil -c icns "$ICONSET_DIR" -o "$ICON_DIR/TextEditor.icns"

echo "Icon created: $ICON_DIR/TextEditor.icns"
ls -la "$ICON_DIR/TextEditor.icns"
