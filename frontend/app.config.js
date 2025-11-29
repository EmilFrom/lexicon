const { withProjectBuildGradle } = require('expo/config-plugins');
const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Custom Plugin to force specific Gradle dependencies.
 */
const withAndroidGradlePlugin = (config) => {
  return withProjectBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language === 'groovy') {
      let contents = modConfig.modResults.contents;

      // 1. Force Android Gradle Plugin to 8.7.2 (Stable for React Native 0.76 / Expo 54)
      contents = contents.replace(
        /classpath\s*\(['"]com\.android\.tools\.build:gradle:.*['"]\)/,
        `classpath('com.android.tools.build:gradle:8.7.2')`
      );

      // 2. Force Kotlin Plugin to 2.0.21
      // This aligns with the KSP error stating 1.9.24 is unsupported, but 2.0.21 is supported.
      contents = contents.replace(
        /classpath\s*\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin:.*['"]\)/,
        `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.20')`
      );

      modConfig.modResults.contents = contents;
    }
    return modConfig;
  });
};

const withAndroidPickFirst = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents += `
        android {
            packagingOptions {
                pickFirst 'lib/**/libworklets.so'
                pickFirst 'lib/**/libreanimated.so'
            }
        }
      `;
    }
    return config;
  });
};

module.exports = {
  expo: {
    name: "TaenketankenUTurn",
    slug: "tt-uturn",
    version: "1.0.0",
    orientation: "default",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      buildNumber: "1.0.0",
      config: {
        usesNonExemptEncryption: false

      },
      bundleIdentifier: "com.emilfrom.tt-uturn",
      infoPlist: {
        CFBundleDisplayName: "Tænketanken U-Turn",
        ITSAppUsesNonExemptEncryption: false
      },
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
            NSPrivacyAccessedAPITypeReasons: ["E174.1"]
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
            NSPrivacyAccessedAPITypeReasons: ["DDA9.1"]
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"]
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
            NSPrivacyAccessedAPITypeReasons: ["8FFB.1"]
          }
        ]
      }
    },
    android: {
      permissions: [],
      versionCode: 1,
      package: "com.emilfrom.tt.uturn",
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      experienceId: "@<username>/<slugName>",
      eas: {
        projectId: "deebffed-fb14-4245-963c-0f9e2e69e6a1"
      }
    },
    plugins: [
      "expo-localization",
      [
        "expo-screen-orientation",
        {
          "initialOrientation": "DEFAULT"
        }
      ],
      [
        "@config-plugins/detox",
        {
          "skipProguard": false,
          "subdomains": [
            "localhost",
            "10.0.2.2"
          ]
        }
      ],
      [
        "expo-secure-store",
        {
          "faceIDPermission": "Allow $(PRODUCT_NAME) to access your Face ID biometric data."
        }
      ],
      [
        "expo-build-properties",
        {
          "android": {
            // UPDATED: Set to 2.0.21 to match KSP requirements
            "kotlinVersion": "2.1.20",
            "buildToolsVersion": "35.0.0",
            "minSdkVersion": 24,
            "compileSdkVersion": 35,
            "targetSdkVersion": 35,
            "ndkVersion": "26.1.10909125"
          }
        }
      ],
      // Inject custom plugin logic to force Gradle dependencies
      withAndroidGradlePlugin,
      withAndroidPickFirst
    ]
  }
};