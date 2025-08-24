name: Generate RSS Feed with ML Training

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Allow manual triggering

jobs:
  train-and-generate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Train ML Model (if needed)
        run: |
          if [ ! -d "ml-model" ] || [ "train-classifier.js" -nt "ml-model" ]; then
            echo "🧠 Training ML model..."
            npm run train || echo "⚠️ Training failed, using fallback classification"
          else
            echo "✅ ML model is up to date"
          fi
        
      - name: Generate RSS Feed with ML
        run: node rss-generator-script.js
        
      - name: Commit and push changes
        run: |
          git config --global user.name 'github-actions'
          git config --global user.email 'github-actions@github.com'
          git add .
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "Daily RSS update with ML classification - $(date)"
            git push
          fi
