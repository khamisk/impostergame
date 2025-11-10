# 🃏 How to Add Your Clash Royale Cards

## Quick Start

1. **Get your card images** - You'll need PNG images of Clash Royale cards
2. **Place them in the `public/cards/` folder**
3. **Update the server.js file** to match your image names

## Step-by-Step Instructions

### Option 1: Use the Default Card List (Recommended)

The game comes with 20 card names already configured. Just add PNG images with these exact names to `public/cards/`:

- `knight.png`
- `archer.png`
- `giant.png`
- `goblin.png`
- `pekka.png`
- `wizard.png`
- `baby-dragon.png`
- `fireball.png`
- `prince.png`
- `hog-rider.png`
- `skeleton-army.png`
- `barbarians.png`
- `minions.png`
- `balloon.png`
- `witch.png`
- `golem.png`
- `lightning.png`
- `ice-spirit.png`
- `miner.png`
- `mega-knight.png`

### Option 2: Add Your Own Custom Cards

1. **Open `server.js`**
2. **Find the `CARDS` array** (around line 13)
3. **Edit it to match your cards:**

```javascript
const CARDS = [
  { name: 'Your Card Name', image: 'your-file-name.png' },
  { name: 'Another Card', image: 'another-card.png' },
  // Add as many as you want!
];
```

4. **Add the corresponding PNG files** to `public/cards/` folder

## 📥 Where to Get Card Images

### Official Sources:
- Clash Royale Wiki: [clashroyale.fandom.com](https://clashroyale.fandom.com)
- RoyaleAPI: [royaleapi.com](https://royaleapi.com)
- Supercell Official Assets

### Tips:
- Use square or portrait images (recommended: 200-400px width)
- PNG format with transparent background works best
- Keep file sizes reasonable (under 500KB each)
- Use lowercase filenames with hyphens (e.g., `mega-knight.png`)

## 🎨 Image Requirements

- **Format**: PNG (recommended) or JPG
- **Size**: 200-400px width works best
- **Aspect Ratio**: Portrait or square (card-like)
- **File naming**: Use lowercase with hyphens
  - ✅ Good: `mega-knight.png`, `baby-dragon.png`
  - ❌ Bad: `Mega Knight.png`, `baby dragon.png`

## 🔍 Example Setup

```
public/
└── cards/
    ├── knight.png          (your actual card image)
    ├── archer.png          (your actual card image)
    ├── giant.png           (your actual card image)
    └── ...more cards
```

## ⚠️ Important Notes

1. **Exact Filename Match**: The `image` field in `server.js` must EXACTLY match your filename
2. **Case Sensitive**: `knight.png` is different from `Knight.png`
3. **No Spaces**: Use hyphens instead of spaces in filenames
4. **Test Locally**: Start the server and create a game to test your cards before deploying

## 🧪 Testing Your Cards

1. Start the server: `npm start`
2. Open browser to `http://localhost:3000`
3. Create a lobby with 3 players (you can open multiple tabs/browsers)
4. Start the game
5. Check if the card image displays correctly

## 🚨 Troubleshooting

**Card not showing?**
- Check the filename matches exactly (including extension)
- Make sure the file is in `public/cards/` folder
- Open browser console (F12) to check for 404 errors
- Try refreshing the page (Ctrl+F5)

**Image looks weird?**
- Try a different image with better aspect ratio
- Resize to around 300px width
- Ensure it's a valid PNG/JPG file

## 💡 Pro Tips

- Add at least 15-20 cards for variety
- Include a mix of troops, spells, and buildings
- Test with cards that have similar themes to make the game harder
- You can add or remove cards anytime - just edit `server.js` and restart

---

**Ready to play?** Once your cards are added, you're all set! 🎮
