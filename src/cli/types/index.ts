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
  appStructure: {
    question: string;
    choices: PromptChoice[];
  };
  testConfig: {
    testDirectory: PromptConfig;
    mainServiceName: PromptConfig;
    readinessEndpoint: PromptConfig;
    readinessPath: PromptConfig;
    urlPrefix: PromptConfig;
  };
  databaseSelection: {
    question: string;
    choices: PromptChoice[];
  };
  databaseConfig: {
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
  };
  additionalServices: {
    question: string;
    default: boolean;
    serviceType: {
      question: string;
      choices: PromptChoice[];
    };
    serviceName: PromptConfig;
    containerName: PromptConfig;
    image: PromptConfig;
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
  appStructure: string;
  testDirectory: string;
  mainServiceName: string;
  readinessEndpoint: boolean;
  readinessPath: string;
  urlPrefix: string;
  databases: string[];
  additionalServices: boolean;
  services: Array<{
    type: string;
    name: string;
    containerName: string;
    image?: string;
  }>;
  configFileType: string;
  databaseConfigs: Record<string, {
    strategy: string;
    seeding: string;
    seedCommand?: string;
    seedFile?: string;
  }>;
}
