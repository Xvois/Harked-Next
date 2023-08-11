export const translateAnalytics: { [key: string]: { name: string; description: string } } = {
    acousticness: {name: 'acoustic', description: 'Music with natural instruments.'},
    danceability: {name: 'upbeat', description: 'Energetic and groove-inducing music.'},
    energy: {name: 'dynamic', description: 'High-energy and lively tunes.'},
    instrumentalness: {name: 'instrumental', description: 'Music without vocals.'},
    liveness: {name: 'live', description: 'Music performed in a live setting.'},
    loudness: {name: 'loud', description: 'Energetic and sonically powerful music.'},
    valence: {name: 'positive', description: 'Uplifting and feel-good melodies.'},
    tempo: {name: 'tempo', description: 'Music with a fast and vibrant tempo.'}
};

export const translateAnalyticsLow: { [key: string]: { name: string; description: string } }  = {
    acousticness: {name: 'electronic', description: 'Music with electronic instruments.'},
    danceability: {name: 'subtle', description: 'Music with a subtle rhythm.'},
    energy: {name: 'calm', description: 'Relaxed and calm music.'},
    instrumentalness: {name: 'vocal', description: 'Music that contains vocals.'},
    liveness: {name: 'studio recorded', description: 'Music that is recorded in a studio.'},
    loudness: {name: 'soft', description: 'Gentle and quiet music.'},
    valence: {name: 'negative', description: 'Music that feels downbeat.'},
    tempo: {name: 'low tempo', description: 'Music that moves at a moderate pace.'}
};

export const analyticsMetrics = ['acousticness', 'danceability', 'energy', 'instrumentalness', 'valence', `tempo`];