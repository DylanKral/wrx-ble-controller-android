import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
/** Cache files use the generated FileProvider, requiring no storage permission. */
export async function shareExport(filename: string, content: string) {
  const path = 'exports/' + filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const file = await Filesystem.writeFile({ path, data: content, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true });
  await Share.share({ title: filename, files: [file.uri], dialogTitle: 'Save or share WRX export' });
}
