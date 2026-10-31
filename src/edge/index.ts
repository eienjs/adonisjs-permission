export interface EdgeBufferContract {
  writeLine: (text: string) => void;
}

export interface EdgeParserContract {
  utils: {
    stringify: (value: unknown) => string;
  };
  process: (children: unknown[], buffer: EdgeBufferContract) => void;
}

export interface EdgeTagTokenContract {
  properties: {
    jsArg: unknown;
  };
  children: unknown[];
}

export interface EdgeContract {
  registerTag: (tag: {
    block: boolean;
    seekable: boolean;
    tagName: string;
    compile: (
      parser: EdgeParserContract,
      buffer: EdgeBufferContract,
      token: EdgeTagTokenContract,
    ) => void;
  }) => void;
}

function isEdge(value: unknown): value is EdgeContract {
  return (
    typeof value === 'object'
    && value !== null
    && 'registerTag' in value
    && typeof value.registerTag === 'function'
  );
}

export function registerEdgeDirectives(edge: unknown): void {
  if (!isEdge(edge)) {
    return;
  }

  // @can('edit-posts') ... @end
  edge.registerTag({
    block: true,
    seekable: true,
    tagName: 'can',
    compile(parser, buffer, token) {
      const expr = parser.utils.stringify(token.properties.jsArg);
      buffer.writeLine(`if (state.auth?.user && await state.auth.user.can(${expr})) {`);
      parser.process(token.children, buffer);
      buffer.writeLine('}');
    },
  });

  // @cannot('edit-posts') ... @end
  edge.registerTag({
    block: true,
    seekable: true,
    tagName: 'cannot',
    compile(parser, buffer, token) {
      const expr = parser.utils.stringify(token.properties.jsArg);
      buffer.writeLine(`if (!state.auth?.user || !(await state.auth.user.can(${expr}))) {`);
      parser.process(token.children, buffer);
      buffer.writeLine('}');
    },
  });

  // @role('admin') ... @end
  edge.registerTag({
    block: true,
    seekable: true,
    tagName: 'role',
    compile(parser, buffer, token) {
      const expr = parser.utils.stringify(token.properties.jsArg);
      buffer.writeLine(`if (state.auth?.user && await state.auth.user.hasRole(${expr})) {`);
      parser.process(token.children, buffer);
      buffer.writeLine('}');
    },
  });

  // @hasrole('admin') ... @end
  edge.registerTag({
    block: true,
    seekable: true,
    tagName: 'hasrole',
    compile(parser, buffer, token) {
      const expr = parser.utils.stringify(token.properties.jsArg);
      buffer.writeLine(`if (state.auth?.user && await state.auth.user.hasRole(${expr})) {`);
      parser.process(token.children, buffer);
      buffer.writeLine('}');
    },
  });

  // @hasanyrole(['admin', 'editor']) ... @end
  edge.registerTag({
    block: true,
    seekable: true,
    tagName: 'hasanyrole',
    compile(parser, buffer, token) {
      const expr = parser.utils.stringify(token.properties.jsArg);
      buffer.writeLine(`if (state.auth?.user && await state.auth.user.hasAnyRole(${expr})) {`);
      parser.process(token.children, buffer);
      buffer.writeLine('}');
    },
  });

  // @hasallroles(['admin', 'editor']) ... @end
  edge.registerTag({
    block: true,
    seekable: true,
    tagName: 'hasallroles',
    compile(parser, buffer, token) {
      const expr = parser.utils.stringify(token.properties.jsArg);
      buffer.writeLine(`if (state.auth?.user && await state.auth.user.hasAllRoles(${expr})) {`);
      parser.process(token.children, buffer);
      buffer.writeLine('}');
    },
  });
}
