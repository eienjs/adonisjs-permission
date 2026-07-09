import eienjs from '@eienjs/eslint-config';

export default eienjs({
  adonisjs: true,
  markdown: true,
  typescript: {
    tsconfigPath: 'tsconfig.json',
    erasableSyntaxOnly: {
      parameterProperties: false,
    },
  },
});
