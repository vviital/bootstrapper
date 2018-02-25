import { exec as execOld } from 'child_process';
import Promise from 'bluebird';
import fs from 'fs';
import path from 'path';

import { dependencies, devDependencies } from './dependencies';

const workingDirectory = process.cwd();

const exec = Promise.promisify(execOld);

const gitInit = async () => {
  await exec('git init');
};

const gitAddFile = async (filename) => {
  await exec(`git add ${filename}`);
};

const gitCommit = async (message) => {
  await exec(`git commit -m '${message}'`);
};

const gitAddFilesAndCommit = async (files = [], message = '') => {
  await Promise.each(files, file => gitAddFile(file));

  await gitCommit(message);
};

const readPackageJson = async () => {
  const packageJsonFile = await Promise.promisify(fs.readFile, { context: fs })('package.json');

  return JSON.parse(packageJsonFile);
};

const savePackageJson = async (packageJson) => {
  const args = ['package.json', JSON.stringify(packageJson, ' ', 2) + '\n'];

  await Promise.promisify(fs.writeFile, { context: fs })(...args);
};

const yarnInit = async () => {
  await exec('yarn init -y');

  const packageJson = await readPackageJson();

  packageJson.scripts = {
    start: '',
    build: 'babel src -d dist',
  };

  await savePackageJson(packageJson);
};

const copyTemplate = async (templateName = '') => {
  const from = path.join(__dirname, 'templates', templateName);
  const to = path.join(workingDirectory, templateName.split('-')[0]);

  await Promise.promisify(fs.copyFile, { context: fs })(from, to);
};

const installDependencies = async (deps, { dev = false } = {}) => {
  if (dev) {
    console.log('Installing devDependecies:');
  } else {
    console.log('Installing dependecies:');
  }

  await Promise.each(deps, async (dependency) => {
    await exec(`yarn add ${dev ? '--dev' : ''} ${dependency}`);

    console.log(`\t - ${dependency}`);
  });
};

const addJestConfig = async () => {
  const packageJson = await readPackageJson();

  packageJson.jest = {
    setupFiles: [
      './test/env.js'
    ],
    coverageDirectory: './coverage',
    coverageReporters: [
      'html'
    ]
  };
  packageJson.scripts.test = 'jest test/* --coverage --runInBand --forceExit';

  await exec('touch test/env.js');

  await savePackageJson(packageJson);
};

const runner = async () => {
  await gitInit();

  fs.writeFileSync('README.md', '');

  await gitAddFilesAndCommit(['README.md'], 'Add README.md');

  console.log('README.md file created');

  await yarnInit();

  await gitAddFilesAndCommit(['package.json'], 'Init yarn');

  console.log('yarn init command performed');

  await exec('mkdir src');
  await exec('mkdir test');
  await exec('touch index.js src/index.js');

  await gitAddFilesAndCommit(['src/*', 'index.js'], 'Add initial js scripts');

  console.log('src and test directories were created');

  await copyTemplate('.gitignore-template');

  await gitAddFilesAndCommit(['.gitignore'], 'Add .gitignore file');

  console.log('.gitignore file was added');

  await installDependencies(dependencies, { dev: false });

  await installDependencies(devDependencies, { dev: true });

  await gitAddFilesAndCommit(['package.json', 'yarn.lock'], 'Add dependencies');

  console.log('dependencies were installed');

  await copyTemplate('.eslintrc-template');

  await gitAddFilesAndCommit(['.eslintrc'], 'Add .eslintrc file');

  console.log('.eslintrc file was added');

  await copyTemplate('.babelrc-template');

  await gitAddFilesAndCommit(['.babelrc'], 'Add .babelrc file');

  console.log('.babelrc file was added');

  await addJestConfig();

  await gitAddFilesAndCommit(['.'], 'Configure jest');

  console.log('jest was configured');
};

export {
  runner,
};
