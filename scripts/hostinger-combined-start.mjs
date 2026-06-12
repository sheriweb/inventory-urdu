#!/usr/bin/env node
/** @deprecated hPanel entry file should be server.js */
import { createRequire } from 'node:module';
createRequire(import.meta.url)('../server.js');
