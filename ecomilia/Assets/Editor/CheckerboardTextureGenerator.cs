using UnityEditor;
using UnityEngine;
using System.IO;

public class CheckerboardTextureGenerator
{
    [MenuItem("Tools/Texture/生成黑白棋盘格")]
    public static void GenerateCheckerboard()
    {
        // 纹理分辨率，越高边缘越清晰
        int resolution = 1024;
        // 单张贴图内的格子数量（每行每列）
        int gridCount = 8;
        
        Texture2D tex = new Texture2D(resolution, resolution, TextureFormat.RGB24, false);
        tex.filterMode = FilterMode.Point; // 像素锐利边缘；要柔和可改为 Bilinear
        tex.wrapMode = TextureWrapMode.Repeat;

        Color colorA = Color.black;
        Color colorB = Color.white;
        int pixelPerGrid = resolution / gridCount;

        for (int y = 0; y < resolution; y++)
        {
            for (int x = 0; x < resolution; x++)
            {
                bool isColorB = ((x / pixelPerGrid) + (y / pixelPerGrid)) % 2 == 0;
                tex.SetPixel(x, y, isColorB ? colorB : colorA);
            }
        }
        tex.Apply();

        // 保存为PNG到项目目录
        string savePath = EditorUtility.SaveFilePanel(
            "保存棋盘格纹理", 
            Application.dataPath, 
            "Checkerboard.png", 
            "png");

        if (!string.IsNullOrEmpty(savePath))
        {
            byte[] pngData = tex.EncodeToPNG();
            File.WriteAllBytes(savePath, pngData);
            AssetDatabase.Refresh();
            Debug.Log($"棋盘格纹理已生成：{savePath}");
        }
    }
}
