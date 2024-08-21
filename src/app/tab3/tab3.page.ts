import { Component, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page implements OnDestroy {
  public deviceName: string | undefined;  // 用于存储设备名称
  public pillowData: string | undefined;  // 用于存储从 pillowCharacteristics 读取到的数据
  private gattServer: BluetoothRemoteGATTServer | undefined;  // 用于存储 GATT 服务器实例
  private intervalId: any;  // 用于存储定时器 ID

  constructor() {}

  // 方法：扫描所有蓝牙设备并连接
  connectToBluetooth() {
    navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['98ecc0aa-88c5-40f7-aef7-b617d2084bad']  // 添加你的服务 UUID
    })
    .then(device => {
      console.log(`Connecting to device: ${device.name}`);
      this.deviceName = device.name || 'Unknown device';

      if (!device.gatt) {
        throw new Error('GATT is not supported by this device.');
      }

      // 连接到 GATT 服务器
      return device.gatt.connect();
    })
    .then(server => {
      this.gattServer = server;
      // 启动定时器，每秒读取一次数据
      this.startReading();
    })
    .catch(error => {
      console.error('Bluetooth error:', error);
      alert(`Bluetooth error: ${error.message}`);
    });
  }

  // 方法：启动定时器，每秒读取一次 pillowCharacteristics 数据
  startReading() {
    if (!this.gattServer) {
      console.error('GATT server is not connected.');
      return;
    }

    this.intervalId = setInterval(() => {
      this.readPillowCharacteristics();
    }, 1000);  // 每秒读取一次
  }

  // 方法：读取 pillowCharacteristics 的值
  readPillowCharacteristics() {
    const pillowServiceUUID = '98ecc0aa-88c5-40f7-aef7-b617d2084bad';
    const pillowCharacteristicsUUID = '2e710d43-a911-4346-afb4-7a03dc252e72';

    this.gattServer?.getPrimaryService(pillowServiceUUID)
      .then(service => service.getCharacteristic(pillowCharacteristicsUUID))
      .then(characteristic => characteristic.readValue())
      .then(value => {
        const decoder = new TextDecoder('utf-8');
        this.pillowData = decoder.decode(value.buffer);
        console.log(`Pillow data: ${this.pillowData}`);
      })
      .catch(error => {
        console.error('Error reading characteristics:', error);
        clearInterval(this.intervalId);  // 如果读取数据失败，停止定时器
      });
  }

  // 清理定时器
  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
