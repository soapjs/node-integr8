export interface PromptChoice {
  name: string;
  value: string;
  description?: string;
}

export interface PromptConfig {
  question: string;
  choices?: PromptChoice[];
  default?: any;
}

export interface PromptsConfig {
  welcome: {
    title: string;
    description: string;
  };
  testType: {
    question: string;
    choices: PromptChoice[];
  };
  testConfig: {
    testDir: PromptConfig;
  };
  componentSelection: {
    question: string;
    choices: PromptChoice[];
  };
  serviceConfig: {
    name: PromptConfig;
    mode: {
      question: string;
      choices: PromptChoice[];
    };
    communicationType: {
      question: string;
      choices: PromptChoice[];
    };
    httpConfig: {
      baseUrl: PromptConfig;
      port: PromptConfig;
      prefix: PromptConfig;
    };
    wsConfig: {
      baseUrl: PromptConfig;
      port: PromptConfig;
      prefix: PromptConfig;
    };
    framework: {
      question: string;
      choices: PromptChoice[];
    };
    readiness: {
      enabled: PromptConfig;
      endpoint: PromptConfig;
      command: PromptConfig;
    };
    localConfig: {
      command: PromptConfig;
      workingDirectory: PromptConfig;
    };
    containerConfig: {
      image: PromptConfig;
      containerName: PromptConfig;
      ports: PromptConfig;
      environment: PromptConfig;
    };
  };
  databaseConfig: {
    name: PromptConfig;
    mode: {
      question: string;
      choices: PromptChoice[];
    };
    type: {
      question: string;
      choices: PromptChoice[];
    };
    strategy: {
      question: string;
      choices: PromptChoice[];
    };
    seeding: {
      question: string;
      choices: PromptChoice[];
    };
    seedCommand: PromptConfig;
    seedFile: PromptConfig;
    localConfig: {
      host: PromptConfig;
      port: PromptConfig;
      username: PromptConfig;
      password: PromptConfig;
    };
    containerConfig: {
      image: PromptConfig;
      containerName: PromptConfig;
      ports: PromptConfig;
      environment: PromptConfig;
    };
    envMapping: {
      host: PromptConfig;
      port: PromptConfig;
      username: PromptConfig;
      password: PromptConfig;
      database: PromptConfig;
      url: PromptConfig;
    };
  };
  storageConfig: {
    name: PromptConfig;
    type: PromptConfig;
    mode: {
      question: string;
      choices: PromptChoice[];
    };
    containerConfig: {
      image: PromptConfig;
      containerName: PromptConfig;
      ports: PromptConfig;
      environment: PromptConfig;
    };
    envMapping: {
      endpoint: PromptConfig;
      region: PromptConfig;
      accessKey: PromptConfig;
      secretKey: PromptConfig;
    };
  };
  messagingConfig: {
    name: PromptConfig;
    type: {
      question: string;
      choices: PromptChoice[];
    };
    mode: {
      question: string;
      choices: PromptChoice[];
    };
    containerConfig: {
      image: PromptConfig;
      containerName: PromptConfig;
      ports: PromptConfig;
      environment: PromptConfig;
    };
    envMapping: {
      brokers: PromptConfig;
      clusterId: PromptConfig;
      endpoint: PromptConfig;
      region: PromptConfig;
    };
    brokers: PromptConfig;
    topics: PromptConfig;
    queues: PromptConfig;
  };
  addMoreComponents: {
    question: string;
    default: boolean;
  };
  configFile: {
    question: string;
    choices: PromptChoice[];
  };
  success: {
    title: string;
    message: string;
  };
  errors: {
    invalidAnswer: string;
    fileExists: string;
    createError: string;
  };
}

export interface InitAnswers {
  testType: string;
  testDir: string;
  configFileType: string;
  components: Array<{
    category: 'service' | 'database' | 'storage' | 'messaging';
    name: string;
    config: any;
  }>;
  services: Array<{
    name: string;
    category: 'service';
    type: string;
    mode: 'local' | 'container';
    communicationType: 'http' | 'ws' | 'custom';
    http?: {
      baseUrl: string;
      port: number;
      prefix: string;
    };
    ws?: {
      baseUrl: string;
      port: number;
      prefix: string;
    };
    framework?: string;
    readiness?: {
      enabled: boolean;
      endpoint?: string;
      command?: string;
    };
    local?: {
      command: string;
      workingDirectory: string;
      args?: string[];
    };
    container?: {
      image: string;
      containerName: string;
      ports?: { host: number; container: number }[];
      environment?: Record<string, string>;
    };
  }>;
  databases: Array<{
    name: string;
    category: 'database';
    mode: 'local' | 'container';
    type: string;
    strategy: string;
    seeding: string;
    seedCommand?: string;
    seedFile?: string;
    local?: {
      host: string;
      port: string;
      username: string;
      password: string;
    };
    container?: {
      image: string;
      containerName: string;
      ports?: { host: number; container: number }[];
      environment?: Record<string, string>;
      envMapping?: {
        host?: string;
        port?: string;
        username?: string;
        password?: string;
        database?: string;
        url?: string;
      };
    };
  }>;
  storages: Array<{
    name: string;
    category: 'storage';
    type: string;
    mode?: 'local' | 'container';
    container?: {
      image: string;
      containerName: string;
      ports?: { host: number; container: number }[];
      environment?: Record<string, string>;
      envMapping?: {
        endpoint?: string;
        region?: string;
        accessKey?: string;
        secretKey?: string;
      };
    };
  }>;
  messaging: Array<{
    name: string;
    category: 'messaging';
    type: string;
    mode?: 'local' | 'container';
    brokers?: string;
    topics?: string;
    queues?: string;
    container?: {
      image: string;
      containerName: string;
      ports?: { host: number; container: number }[];
      environment?: Record<string, string>;
      envMapping?: {
        brokers?: string;
        clusterId?: string;
        endpoint?: string;
        region?: string;
      };
    };
  }>;
}
