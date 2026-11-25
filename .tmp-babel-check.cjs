const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');
const files = [
  'src/Components/utils/PhotoUtility.jsx',
  'src/Components/utils/faceSheet.js',
  'src/Components/utils/faceMetrics.js',
  'src/pages/product/customize/[id].jsx',
  'src/pages/checkout/index.jsx',
  'src/pages/checkout/success.jsx',
  'src/pages/superAdmin/orders.jsx',
];
let failed = 0;
for (const f of files) {
  try {
    babel.transformFileSync(path.resolve(f), { babelrc: false, configFile: false, presets: [require.resolve('next/babel')], filename: f });
    console.log('ok  ', f);
  } catch (e) {
    failed++;
    console.log('FAIL', f, '::', e.message.split(String.fromCharCode(10))[0]);
  }
}
process.exit(failed ? 1 : 0);