// Edite esta lista para adicionar suas músicas.
// O valor em 'file' deve ser o nome exato do arquivo na pasta /musics/
// O valor 'cover' é um fallback: será usado se a música não tiver uma capa embutida.

const songs = [
    {
        title: "Nome da Música 1",
        artist: "Nome do Artista 1",
        file: "musica1.mp3",
        cover: "cover1.jpg" // Opcional
    },
    {
        title: "Outra Faixa Legal",
        artist: "Banda Famosa",
        file: "musica2.mp3",
        cover: "cover2.jpg" // Opcional
    },
    {
        title: "Música Sem Capa",
        artist: "Artista Desconhecido",
        file: "musica3.mp3" // Sem 'cover', usará a capa padrão
    }
    // Adicione mais músicas aqui
];