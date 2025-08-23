const fetch = require('node-fetch');
const xml2js = require('xml2js');
const fs = require('fs');
const brain = require('brain.js');
const FeatureExtractor = require('./ml-features');

// Initialize ML components
let mlModel = null;
const featureExtractor = new FeatureExtractor();

// Load trained model
function loadMLModel() {
    try {
        if (fs.existsSync('ml-classifier-model.json')) {
            const modelData = JSON.parse(fs.readFileSync('ml-classifier-model.json', 'utf8'));
            mlModel = new brain.NeuralNetwork();
            mlModel.fromJSON(modelData);
            console.log('✅ ML model loaded successfully');
            return true;
        } else {
            console.log('⚠️  ML model not found. Run: npm run train');
            return false;
        }
    } catch (error) {
        console.error('❌ Error loading ML model:', error.message);
        return false;
    }
}

// Enhanced RSS feeds array with all Korean institutions
const feeds = [
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1lGTpA7S74whuNVC_kQy0F4ncgCxeB9B9U0hbi6Wldiv2cIgV2/?limit=50&utm_campaign=pubmed-2&fc=20250822163126',
        name: 'KAIST'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1bo4uOs-bB_ZLOeoRMDuMyKrqOCTTJrR8i4c8aBDtpAcbJ09ch/?limit=50&utm_campaign=pubmed-2&fc=20250822163228',
        name: 'SNU'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1p9j2Ia0knT7gmGP5yr8TGKmrRRyRQ0oWVA_KWuJa7rtxBZMim/?limit=100&utm_campaign=pubmed-2&fc=20250822201347',
        name: 'Yonsei University'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1-CFTYUQzm9gD46gso3zjzxFxkq73bOFUJwQNLwmd6SldMXg0f/?limit=100&utm_campaign=pubmed-2&fc=20250822201727',
        name: 'SKKU'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1ZyzHXV_xuJMd_mA0Sq1F0U-jUGJIU2JUAtLtKea9s3vCCDMAg/?limit=100&utm_campaign=pubmed-2&fc=20250822201839',
        name: 'POSTECH'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/12guA9dSu1tGGvNP7mhhDa45fpbWpGPzILFj69wJJFdG48xkuI/?limit=100&utm_campaign=pubmed-2&fc=20250822205125',
        name: 'Korea University'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1HyCEy3kccvK7zE0-AQi3b_3KChicv5K_t8YL3UITyEWtrEgUY/?limit=100&utm_campaign=pubmed-2&fc=20250822210237',
        name: 'IBS'
    }
];

// Keep all your existing helper functions (extractPMID, parseCSVLine, etc.)
function extractPMID(url) {
    const match = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
    return match ? match[1] : null;
}

function extractEnhancedInfo(title, description) {
    // Your existing function - keep as is
    if (!description) {
        return {
            journal: null,
            objective: null,
            significance: null,
            conclusion: null
        };
    }
    // ... rest of your existing extractEnhancedInfo function
    return {
        journal: null,
        objective: null,
        significance: null,
        conclusion: null
    };
}

// Enhanced fetchFeed with ML classification
async function fetchFeed(feed) {
    try {
        console.log(`Fetching ${feed.name} feed...`);
        const response = await fetch(feed.url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const xmlData = await response.text();
        
        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: true,
            normalize: true,
            normalizeTags: true,
            trim: true
        });
        
        const result = await parser.parseStringPromise(xmlData);
        
        if (!result.rss || !result.rss.channel || !result.rss.channel.item) {
            console.log(`No items found in ${feed.name} feed`);
            return [];
        }
        
        const items = Array.isArray(result.rss.channel.item) 
            ? result.rss.channel.item 
            : [result.rss.channel.item];
        
        return items.map(item => {
            // Robust date parsing
            let pubDate;
            try {
                const dateStr = item.pubdate || item.pubDate || item.pubdate;
                pubDate = dateStr ? new Date(dateStr) : new Date();
                if (isNaN(pubDate.getTime())) {
                    pubDate = new Date();
                }
            } catch (e) {
                pubDate = new Date();
            }

            // Extract enhanced information
            const enhancedInfo = extractEnhancedInfo(item.title, item.description);
            
            // 🧠 ML CLASSIFICATION
            let subjectArea = 'multidisciplinary';
            let confidence = 0;
            
            if (mlModel) {
                try {
                    const features = featureExtractor.extractFeatures(item.title || '', item.description || '');
                    const mlResult = mlModel.run(features);
                    
                    // Find the category with highest confidence
                    const categories = Object.keys(mlResult);
                    const bestCategory = categories.reduce((a, b) => mlResult[a] > mlResult[b] ? a : b);
                    
                    subjectArea = bestCategory;
                    confidence = mlResult[bestCategory];
                    
                    console.log(`📝 ${item.title.substring(0, 50)}... → ${subjectArea} (${(confidence * 100).toFixed(1)}%)`);
                } catch (error) {
                    console.error('ML classification error:', error.message);
                    // Fallback to rule-based classification
                    const features = featureExtractor.extractFeatures(item.title || '', item.description || '');
                    subjectArea = featureExtractor.classifyFeatures(features);
                }
            } else {
                // Fallback to rule-based classification
                const features = featureExtractor.extractFeatures(item.title || '', item.description || '');
                subjectArea = featureExtractor.classifyFeatures(features);
            }
            
            return {
                title: item.title || 'No title',
                link: item.link || '',
                description: item.description || '',
                pubDate: pubDate,
                source: feed.name,
                pmid: extractPMID(item.link),
                guid: item.link || item.guid || '',
                // Enhanced fields with ML classification
                subjectArea: subjectArea,
                confidence: confidence,
                journal: enhancedInfo.journal,
                objective: enhancedInfo.objective,
                significance: enhancedInfo.significance,
                conclusion: enhancedInfo.conclusion
            };
        }).filter(item => item.title && item.link);
        
    } catch (error) {
        console.error(`Error fetching ${feed.name} feed:`, error.message);
        return [];
    }
}

// Keep all your existing functions (combineAndDeduplicate, loadExistingArchive, etc.)
function combineAndDeduplicate(allFeeds) {
    const paperMap = new Map();
    
    allFeeds.forEach(feedItems => {
        feedItems.forEach(item => {
            const key = item.pmid || item.link;
            
            if (paperMap.has(key)) {
                const existingPaper = paperMap.get(key);
                if (!existingPaper.institutions.includes(item.source)) {
                    existingPaper.institutions.push(item.source);
                    existingPaper.institutions.sort();
                }
            } else {
                const newPaper = {
                    ...item,
                    institutions: [item.source]
                };
                paperMap.set(key, newPaper);
            }
        });
    });
    
    return Array.from(paperMap.values());
}

// Keep your existing archive functions but add subjectArea to CSV
function saveEnhancedArchive(newPapers) {
    // ... your existing archive logic but add subjectArea to CSV
    const csvHeaders = 'Institutions,Date,Title,Subject Area,Journal,Link\n';
    // ... rest of your archive function
    
    return { added: 0, total: 0 }; // Placeholder
}

// Enhanced generateRSS function
async function generateRSS() {
    console.log('🚀 Starting RSS generation with ML classification...');
    
    // Load ML model
    const mlLoaded = loadMLModel();
    if (!mlLoaded) {
        console.log('⚠️  Proceeding with rule-based classification');
    }
    
    try {
        // Fetch from all feeds
        const feedPromises = feeds.map(feed => fetchFeed(feed));
        const results = await Promise.all(feedPromises);
        
        // Log results per institution
        results.forEach((items, index) => {
            console.log(`${feeds[index].name}: ${items.length} items`);
        });
        
        let allItems = combineAndDeduplicate(results);
        allItems.sort((a, b) => b.pubDate - a.pubDate);
        
        console.log(`After deduplication: ${allItems.length} unique items`);
        
        // Generate subject area statistics
        const subjectAreaStats = {};
        allItems.forEach(item => {
            subjectAreaStats[item.subjectArea] = (subjectAreaStats[item.subjectArea] || 0) + 1;
        });
        
        console.log('📊 Subject area distribution:');
        Object.entries(subjectAreaStats).forEach(([area, count]) => {
            console.log(`  ${area}: ${count} papers`);
        });
        
        // Save to archive with ML categories
        const archiveStats = saveEnhancedArchive(allItems);
        
        // Limit display items to 150 most recent
        const displayItems = allItems.slice(0, 150);
        
        const baseUrl = 'https://rimrim05.github.io/Korean-Academic-RSS/';
        
        // Generate enhanced statistics with subject areas
        const institutionBreakdown = {};
        feeds.forEach(feed => {
            institutionBreakdown[feed.name] = displayItems.filter(item => item.institutions.includes(feed.name)).length;
        });
        
        const subjectAreaBreakdown = {};
        displayItems.forEach(item => {
            subjectAreaBreakdown[item.subjectArea] = (subjectAreaBreakdown[item.subjectArea] || 0) + 1;
        });

        // Generate JSON feed with ML classifications
        const jsonFeed = {
            title: "Korean Academic Publications with ML Classification",
            description: "Latest research from top Korean institutions with AI-powered subject classification",
            lastBuildDate: new Date().toISOString(),
            totalItems: displayItems.length,
            totalArchived: archiveStats.total,
            newPapersAdded: archiveStats.added,
            institutionBreakdown: institutionBreakdown,
            subjectAreaBreakdown: subjectAreaBreakdown,
            mlClassificationEnabled: mlLoaded,
            institutions: feeds.map(f => f.name),
            items: displayItems.map(item => ({
                title: item.title,
                link: item.link,
                description: item.description,
                pubDate: safeToISOString(item.pubDate),
                institutions: item.institutions,
                pmid: item.pmid,
                // ML-enhanced fields
                subjectArea: item.subjectArea,
                confidence: item.confidence,
                journal: item.journal,
                objective: item.objective,
                significance: item.significance,
                conclusion: item.conclusion
            }))
        };
        
        fs.writeFileSync('feed.json', JSON.stringify(jsonFeed, null, 2));

        // Your existing RSS and stats generation...
        
        console.log('✅ Enhanced RSS feed with ML classification generated successfully!');
        console.log(`🧠 ML Classification: ${mlLoaded ? 'ENABLED' : 'DISABLED (using rules)'}`);
        console.log(`📊 Subject areas found: ${Object.keys(subjectAreaBreakdown).length}`);
        
    } catch (error) {
        console.error('❌ Error generating RSS:', error);
        process.exit(1);
    }
}

function safeToISOString(date) {
    try {
        if (!date) return new Date().toISOString();
        return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    } catch (e) {
        return new Date().toISOString();
    }
}

generateRSS();
