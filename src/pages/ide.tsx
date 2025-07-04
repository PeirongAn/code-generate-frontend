import React from 'react';
import Editor from '@monaco-editor/react';

const IDEPage = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-800 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Python IDE</h1>
      <div className="flex flex-grow space-x-4">
        {/* Main Code Section */}
        <div className="flex flex-col w-1/2">
          <h2 className="text-lg mb-2">主代码</h2>
          <div className="flex-grow border border-gray-600 rounded">
            <Editor
              height="100%"
              defaultLanguage="python"
              defaultValue="# 在这里编写你的主 Python 代码"
              theme="vs-dark"
            />
          </div>
        </div>

        {/* Test and Output Section */}
        <div className="flex flex-col w-1/2 space-y-4">
          {/* Test Code Section */}
          <div className="flex flex-col h-1/2">
            <h2 className="text-lg mb-2">测试代码</h2>
            <div className="flex-grow border border-gray-600 rounded">
              <Editor
                height="100%"
                defaultLanguage="python"
                defaultValue="# 在这里编写你的测试代码"
                theme="vs-dark"
              />
            </div>
          </div>

          {/* Output Section */}
          <div className="flex flex-col h-1/2">
            <h2 className="text-lg mb-2">输出</h2>
            <div className="flex-grow border border-gray-600 rounded bg-black">
              <Editor
                height="100%"
                defaultLanguage="text"
                value="// 执行结果会显示在这里"
                theme="vs-dark"
                options={{ readOnly: true }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IDEPage; 