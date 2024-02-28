import { useState } from 'react';
import { Mint } from "./mint/Mint";
import { TabWrapper } from "./TabWrapper";

const Tabs = () => {
  const [activeTab, setActiveTab] = useState('Mint');

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="my-4 flex w-full flex-row justify-center">
      <div
        role="tablist"
        className="daisyui-tabs daisyui-tabs-lifted daisyui-tabs-lg"
      >
        <TabWrapper
          tab="Mint"
          activeTab={activeTab}
          handleTabClick={handleTabClick}
        >
          <Mint />
        </TabWrapper>
        <TabWrapper
          tab="Swap"
          activeTab={activeTab}
          handleTabClick={handleTabClick}
        >
          <div>TBD</div>
        </TabWrapper>
        <TabWrapper
          tab="Pay"
          activeTab={activeTab}
          handleTabClick={handleTabClick}
        >
          <div>TBD</div>
        </TabWrapper>
        <TabWrapper
          tab="Vote"
          activeTab={activeTab}
          handleTabClick={handleTabClick}
        >
          <div>TBD</div>
        </TabWrapper>
      </div>
    </div>
  );
};

export { Tabs };
