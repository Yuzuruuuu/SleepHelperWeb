import { Injectable, inject } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
import { Directory, FileInfo, Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class AudioFileService {
  private readonly platform = inject(Platform);

  public readonly files: Map<FileInfo, string> = new Map();
  public receivedData: string = '';
  public isTriggered: boolean = false;
  public addedFiles: string[] = [];

  async writeFile(file: File) {
    // 首先检查是否已经存在相同名称的文件
    const existingFile = Array.from(this.files.keys()).find(f => f.name === file.name);
    console.log('checking...');
    // 如果文件已经存在，直接返回，避免重复添加
    if (existingFile) {
      console.warn(`File with name ${file.name} already exists.`);
      return;
    }
    console.log('reading...');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);

    const blob = new Blob([new Uint8Array(arrayBuffer)], { type: file.type });
    const reader = new FileReader();
    reader.onload = async () => {
      const { uri } = await Filesystem.writeFile({
        path: file.name,
        data: reader.result as string,
        directory: Directory.External,
        recursive: true
      });
      console.log('loading...');
      const { lastModified, name, size } = file;
      const fileInfo: FileInfo = { mtime: lastModified, name, size, type: 'file', uri };
      const src = this.platform.is('hybrid') ? Capacitor.convertFileSrc(uri) : URL.createObjectURL(blob);
      this.files.set(fileInfo, src);
    };

    reader.readAsDataURL(blob);
    console.log('done...');
  }

  async deleteFile(fileInfo: FileInfo): Promise<void> {
    try {
      await Filesystem.deleteFile({ path: fileInfo.name, directory: Directory.External });
      this.files.delete(fileInfo);
    } catch (error) {
      console.error(error);
    }
  }

  async readFiles(rootDir = '') {
    const result = await Filesystem.readdir({ path: rootDir, directory: Directory.External });
    for (const fileName of result.files) {
      const fileInfo: FileInfo = {
        name: fileName.name,
        type: 'file',
        uri: fileName.uri,
        size: fileName.size,
        mtime: fileName.mtime
      };
      const src = await this.getAudioSrc(fileInfo);
      this.files.set(fileInfo, src);
    }
  }

  private async getAudioSrc(fileInfo: FileInfo): Promise<string> {
    if (this.platform.is('hybrid')) {
      return Capacitor.convertFileSrc(fileInfo.uri);
    } else {
      try {
        const result = await Filesystem.readFile({ path: fileInfo.uri, directory: Directory.External });
        const blob = new Blob([result.data], { type: 'audio/mpeg' });
        return URL.createObjectURL(blob);
      } catch (error) {
        console.error('Error reading audio file:', error);
        return '';
      }
    }
  }

  private async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }
}
