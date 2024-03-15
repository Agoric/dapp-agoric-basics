import { useState } from 'react';
import { Mint } from './mint/Mint';
import { Swap } from './swap/Swap';
import { TabWrapper } from './TabWrapper';
import { Notifications } from './Notifications';
import { NotificationContext } from '../context/NotificationContext';

// notification related types
const dynamicToastChildStatuses = [
  'info',
  'success',
  'warning',
  'error',
] as const;

type DynamicToastChild = {
  text: string;
  status: (typeof dynamicToastChildStatuses)[number];
};

const Tabs = () => {
  // tab state related functions
  const [activeTab, setActiveTab] = useState('Swap');

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };

  // notification related functions
  const [notifications, setNotifications] = useState<DynamicToastChild[]>([]);

  const addNotification = (newNotification: DynamicToastChild) => {
    setNotifications([...notifications, newNotification]);
  };

  return (
    <div className="my-4 flex w-full flex-row justify-center">
      <Notifications
        notifications={notifications}
        setNotifications={setNotifications}
      />
      <NotificationContext.Provider
        value={{ addNotification: addNotification }}
      >
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
            <Swap />
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
      </NotificationContext.Provider>
    </div>
  );
};

export { Tabs };
export type { DynamicToastChild };
