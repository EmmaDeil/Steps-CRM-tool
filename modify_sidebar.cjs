const fs = require('fs');

const filePath = 'src/components/modules/DocSignRequest.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state for activeSidebarTab
content = content.replace(
  'const [showRightSidebar, setShowRightSidebar] = useState(true);',
  'const [showRightSidebar, setShowRightSidebar] = useState(true);\n  const [activeSidebarTab, setActiveSidebarTab] = useState("recipients"); // "recipients" or "fields"'
);

// 2. Extract Left Sidebar
const leftSidebarStart = content.indexOf('{/* Left Sidebar - Recipients & Settings */}');
const leftSidebarEndStr = '        </aside>\n\n        {/* Main Document Preview Area */}';
const leftSidebarEnd = content.indexOf(leftSidebarEndStr);
if (leftSidebarStart === -1 || leftSidebarEnd === -1) {
  console.log('Failed to find Left Sidebar');
  process.exit(1);
}
const leftSidebarContent = content.substring(leftSidebarStart, leftSidebarEnd + '        </aside>'.length);

// 3. Remove Left Sidebar from its original position
content = content.substring(0, leftSidebarStart) + content.substring(leftSidebarEnd + '        </aside>\n\n'.length);

// 4. Update the Right Sidebar to be a unified sidebar with tabs
// We need to find the start of the Right Sidebar
const rightSidebarStart = content.indexOf('{/* Right Sidebar - Form Fields */}');
if (rightSidebarStart === -1) {
  console.log('Failed to find Right Sidebar');
  process.exit(1);
}

// Replace the Right Sidebar outer container to have tabs
const rightSidebarOuterStart = content.indexOf('<aside', rightSidebarStart);
const rightSidebarOuterEnd = content.indexOf('>', rightSidebarOuterStart) + 1;
const asideTag = content.substring(rightSidebarOuterStart, rightSidebarOuterEnd);

// Find the end of Right Sidebar
const rightSidebarEndMatch = content.indexOf('</aside>', rightSidebarOuterStart);
if (rightSidebarEndMatch === -1) {
  console.log('Failed to find Right Sidebar End');
  process.exit(1);
}

const rightSidebarInnerContent = content.substring(rightSidebarOuterEnd, rightSidebarEndMatch);

// We need to strip the "Close button" from leftSidebarContent and rightSidebarInnerContent, or merge them.
// Let's extract the actual content of left sidebar (after the close button div)
const leftContentStart = leftSidebarContent.indexOf('          {/* Recipients Section */}');
let leftInnerContent = '';
if (leftContentStart !== -1) {
  leftInnerContent = leftSidebarContent.substring(leftContentStart, leftSidebarContent.length - '\n        </aside>'.length);
}

// Same for right inner content, skip the header
const rightContentStart = rightSidebarInnerContent.indexOf('          <div className="p-5 border-b border-[#f0f2f4]">');
let rightInnerContent = '';
if (rightContentStart !== -1) {
  rightInnerContent = rightSidebarInnerContent.substring(rightContentStart);
}

const newRightSidebar = `
        {/* Right Sidebar - Combined */}
        {/* Mobile backdrop */}
        {showRightSidebar && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setShowRightSidebar(false)}
          />
        )}
        <aside
          className={\`fixed lg:relative z-40 lg:z-auto top-0 right-0 h-full flex flex-col bg-white shrink-0 shadow-sm transition-all duration-300 ease-in-out \${
            showRightSidebar
              ? "w-80 lg:w-96 translate-x-0 border-l border-[#e5e7eb] opacity-100"
              : "w-80 lg:w-0 translate-x-full lg:translate-x-0 lg:overflow-hidden lg:border-l-0 lg:opacity-0"
          }\`}
        >
          {/* Header & Tabs */}
          <div className="flex flex-col border-b border-gray-200">
            <div className="flex items-center justify-between p-4 pb-2">
              <span className="font-bold text-gray-900">Document Setup</span>
              <button onClick={() => setShowRightSidebar(false)} className="text-gray-500 hover:text-gray-700" title="Collapse Sidebar">
                <i className="fa-solid fa-angles-right text-lg hidden lg:inline" />
                <i className="fa-solid fa-times text-lg lg:hidden" />
              </button>
            </div>
            <div className="flex px-4 gap-4">
              <button
                onClick={() => setActiveSidebarTab("recipients")}
                className={\`pb-2 text-sm font-medium transition-colors border-b-2 \${
                  activeSidebarTab === "recipients"
                    ? "border-[#137fec] text-[#137fec]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }\`}
              >
                Recipients & Settings
              </button>
              <button
                onClick={() => setActiveSidebarTab("fields")}
                className={\`pb-2 text-sm font-medium transition-colors border-b-2 \${
                  activeSidebarTab === "fields"
                    ? "border-[#137fec] text-[#137fec]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }\`}
              >
                Form Fields
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
            {activeSidebarTab === "recipients" ? (
              <div className="flex flex-col animate-fadeIn">
${leftInnerContent}
              </div>
            ) : (
              <div className="flex flex-col flex-1 animate-fadeIn h-full">
${rightInnerContent}
              </div>
            )}
          </div>
        </aside>
`;

const beforeRightSidebar = content.substring(0, rightSidebarStart);
const afterRightSidebar = content.substring(rightSidebarEndMatch + '</aside>'.length);

content = beforeRightSidebar + newRightSidebar + afterRightSidebar;

fs.writeFileSync(filePath, content);
console.log('Successfully updated DocSignRequest.jsx');
