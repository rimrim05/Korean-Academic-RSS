// train-classifier.js - TensorFlow.js version (no GPU dependencies)
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');

// Simple training data for academic classification
const trainingData = [
    // Computer Science
    { text: "machine learning artificial intelligence neural network algorithm", category: 0 },
    { text: "deep learning computer vision software system programming", category: 0 },
    { text: "data mining artificial intelligence algorithm optimization", category: 0 },
    
    // Biomedical Sciences
    { text: "clinical medical patient treatment therapy diagnosis", category: 1 },
    { text: "biological cell gene protein molecular dna", category: 1 },
    { text: "medical health disease diagnosis clinical patient", category: 1 },
    
    // Materials Science
    { text: "material synthesis nanoparticle device fabrication battery", category: 2 },
    { text: "solar energy nanomaterial composite semiconductor", category: 2 },
    { text: "device sensor battery energy material synthesis", category: 2 },
    
    // Cancer Research
    { text: "cancer tumor oncology chemotherapy radiation treatment", category: 3 },
    { text: "tumor malignant carcinoma metastasis oncology", category: 3 },
    
    // Neuroscience
    { text: "brain neuron cognitive memory alzheimer parkinson", category: 4 },
    { text: "neurological behavior brain cognitive neuron", category: 4 }
];

const categories = ['Computer Science', 'Biomedical', 'Materials Science', 'Cancer Research', 'Neuroscience'];

function preprocessText(text) {
    // Simple preprocessing: convert to lowercase and get word counts
    const words = text.toLowerCase().split(' ');
    const wordCount = {};
    
    // Count word frequencies
    words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Convert to feature vector (simple bag of words)
    const allWords = ['machine', 'learning', 'artificial', 'intelligence', 'neural', 'network', 
                      'clinical', 'medical', 'patient', 'treatment', 'biological', 'cell', 'gene',
                      'material', 'synthesis', 'device', 'battery', 'energy', 'cancer', 'tumor',
                      'brain', 'neuron', 'cognitive', 'algorithm', 'data', 'computer', 'software'];
    
    return allWords.map(word => wordCount[word] || 0);
}

async function trainClassifier() {
    console.log('🧠 Starting TensorFlow.js classifier training...');
    
    // Prepare training data
    const xs = trainingData.map(item => preprocessText(item.text));
    const ys = trainingData.map(item => {
        const oneHot = new Array(categories.length).fill(0);
        oneHot[item.category] = 1;
        return oneHot;
    });
    
    // Create tensors
    const xTrain = tf.tensor2d(xs);
    const yTrain = tf.tensor2d(ys);
    
    // Create a simple neural network model
    const model = tf.sequential({
        layers: [
            tf.layers.dense({ inputShape: [27], units: 16, activation: 'relu' }),
            tf.layers.dropout({ rate: 0.2 }),
            tf.layers.dense({ units: 8, activation: 'relu' }),
            tf.layers.dense({ units: categories.length, activation: 'softmax' })
        ]
    });
    
    // Compile the model
    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });
    
    console.log('📊 Training model...');
    
    // Train the model
    const history = await model.fit(xTrain, yTrain, {
        epochs: 100,
        batchSize: 2,
        validationSplit: 0.1,
        verbose: 1
    });
    
    // Save the model
    await model.save('file://./ml-model');
    
    console.log('✅ Training completed!');
    console.log(`Final accuracy: ${history.history.acc[history.history.acc.length - 1]}`);
    
    // Test the model
    testModel(model);
    
    // Clean up
    xTrain.dispose();
    yTrain.dispose();
    model.dispose();
    
    return true;
}

function testModel(model) {
    console.log('\n🧪 Testing model...');
    
    const testCases = [
        "machine learning neural network artificial intelligence",
        "cancer tumor treatment chemotherapy oncology",
        "material battery solar energy device synthesis"
    ];
    
    testCases.forEach(testCase => {
        const features = preprocessText(testCase);
        const prediction = model.predict(tf.tensor2d([features]));
        const probabilities = prediction.arraySync()[0];
        
        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        console.log(`"${testCase}" → ${categories[maxIndex]} (${(probabilities[maxIndex] * 100).toFixed(1)}%)`);
        
        prediction.dispose();
    });
}

if (require.main === module) {
    trainClassifier().catch(console.error);
}

module.exports = { trainClassifier };
